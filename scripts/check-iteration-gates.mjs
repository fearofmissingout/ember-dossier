import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const releaseMode = args.has("--release");
const productionMode = args.has("--production");
const quickMode = args.has("--quick");
const helpMode = args.has("--help") || args.has("-h");

if (helpMode) {
  console.log(`Usage:
  npm run check:quick
  npm run check:release
  npm run dev:playtest
  npm run local:check
  npm run iteration:check
  npm run release:preflight
  npm run release:verify

Options:
  --quick        Run the fast local loop: contracts, copy checks, and playable loop only.
  --release      Require a clean tree based on origin/master before running gates.
  --production   Also run the deployed production smoke test.`);
  process.exit(0);
}

if (releaseMode) {
  assertCleanGitTree();
  ensureProductionRefIsCurrent();
  assertBasedOnProduction();
}

assertCloudflarePagesConfig();
run("node", ["scripts/check-workflow-contract.mjs"], "Workflow contract");
run("npm", ["run", "smoke:contract"], "Local smoke contract");
run("npm", ["run", "copy:check"], "Visible copy check");
run("npm", ["run", "playable:check"], "Playable loop smoke");

if (quickMode) {
  console.log("\nFast local gates passed. Daily loop: npm run dev:playtest + npm run check:quick. Run npm run iteration:check before larger merges or release candidates.");
  process.exit(0);
}

run("npm", ["test"], "Unit and smoke tests");
run("npm", ["run", "build"], "Typecheck and production build");

if (productionMode) {
  run("npm", ["run", "playtest:check"], "Production playtest smoke");
}

console.log("\nIteration gates passed.");

function assertCleanGitTree() {
  const status = capture("git", ["status", "--porcelain"]);
  if (status.trim()) {
    console.error("Release preflight requires a clean git tree. Commit or stash local changes first.");
    console.error(status);
    process.exit(1);
  }
}

function assertBasedOnProduction() {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", "origin/master", "HEAD"], {
    shell: useShell(),
    stdio: "ignore"
  });

  if (result.status !== 0) {
    console.error("Release branch is not based on the latest origin/master.");
    console.error("Create a fresh release branch from origin/master, then cherry-pick or merge the finished feature commit.");
    process.exit(1);
  }
}

function ensureProductionRefIsCurrent() {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = runOptional("git", ["fetch", "origin", "master"], `Fetch production branch (attempt ${attempt}/3)`);
    if (result.status === 0) {
      return;
    }
  }

  const localSha = capture("git", ["rev-parse", "origin/master"]).trim();
  const remoteShaResult = captureOptional("gh", ["api", "repos/fearofmissingout/ember-dossier/commits/master", "--jq", ".sha"]);
  const remoteSha = remoteShaResult.status === 0 ? remoteShaResult.stdout.trim() : "";

  if (remoteSha && localSha === remoteSha) {
    console.log(`\n==> Fetch unavailable, but origin/master matches GitHub master (${localSha.slice(0, 7)}).`);
    return;
  }

  console.error("Could not verify the latest production branch.");
  console.error("Retry when git fetch can reach GitHub, or update origin/master before releasing.");
  if (remoteSha) {
    console.error(`local origin/master: ${localSha}`);
    console.error(`GitHub master:       ${remoteSha}`);
  }
  process.exit(1);
}

function assertCloudflarePagesConfig() {
  const path = "wrangler.toml";
  if (!existsSync(path)) {
    console.error("Missing wrangler.toml. Cloudflare Pages deploys must keep Pages configuration in the repo.");
    process.exit(1);
  }

  const config = readFileSync(path, "utf8");
  const outputDir = config.match(/^\s*pages_build_output_dir\s*=\s*"([^"]+)"\s*$/m)?.[1];
  const hasAssetsSection = /^\s*\[assets\]\s*$/m.test(config);

  if (outputDir !== "dist") {
    console.error('wrangler.toml must set pages_build_output_dir = "dist" so Cloudflare Pages uses the built Vite output.');
    process.exit(1);
  }

  if (hasAssetsSection) {
    console.error('wrangler.toml must not include [assets]; Cloudflare Pages config validation rejects Workers static asset settings.');
    process.exit(1);
  }
}

function capture(command, commandArgs) {
  const result = captureOptional(command, commandArgs);

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function captureOptional(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    shell: useShell(),
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  return result;
}

function run(command, commandArgs, label) {
  const result = runOptional(command, commandArgs, label);

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runOptional(command, commandArgs, label) {
  console.log(`\n==> ${label}`);
  return spawnSync(command, commandArgs, {
    shell: useShell(),
    stdio: "inherit"
  });
}

function useShell() {
  return process.platform === "win32";
}
