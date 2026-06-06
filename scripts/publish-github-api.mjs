import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultRepo = "fearofmissingout/ember-dossier";
const defaultBranch = "master";

export function parsePublishArgs(argv) {
  const options = {
    branch: defaultBranch,
    commit: "HEAD",
    dryRun: false,
    files: [],
    help: false,
    repo: defaultRepo,
    runChecks: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--repo") {
      options.repo = requireValue(argv, (index += 1), arg);
    } else if (arg === "--branch") {
      options.branch = requireValue(argv, (index += 1), arg);
    } else if (arg === "--commit") {
      options.commit = requireValue(argv, (index += 1), arg);
    } else if (arg === "--skip-checks") {
      options.runChecks = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--files") {
      while (argv[index + 1] && !argv[index + 1].startsWith("--")) {
        options.files.push(argv[index + 1]);
        index += 1;
      }
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.files.push(arg);
    }
  }

  options.files = normalizeFileList(options.files);
  return options;
}

export function selectPublishFiles({ explicitFiles, headChangedFiles }) {
  const source = explicitFiles.length > 0 ? explicitFiles : headChangedFiles;
  return normalizeFileList(source);
}

export function createPublishPlan({ branch, files, localCommitSha, message, parentSha, repo }) {
  const normalizedFiles = normalizeFileList(files);
  if (normalizedFiles.length === 0) {
    throw new Error("No files selected for API publishing.");
  }

  return {
    branch,
    fileCount: normalizedFiles.length,
    files: normalizedFiles,
    localCommitSha,
    message,
    parentSha,
    repo
  };
}

export function formatPublishPlanSummary(plan) {
  return `Publishing ${plan.fileCount} files from ${plan.localCommitSha.slice(0, 7)} to ${plan.repo}:${plan.branch} on parent ${plan.parentSha.slice(0, 7)}.`;
}

async function main(argv) {
  const options = parsePublishArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  if (options.runChecks) {
    run("npm", ["run", "iteration:check"], "Local release gates");
  }

  assertCleanGitTree();

  const parentSha = ghText([`repos/${options.repo}/git/ref/heads/${options.branch}`, "--jq", ".object.sha"]);
  const localCommitSha = capture("git", ["rev-parse", options.commit]).trim();
  const message = capture("git", ["log", "-1", "--pretty=%B", options.commit]).trim();
  const headChangedFiles = capture("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", options.commit])
    .split(/\r?\n/)
    .filter(Boolean);
  const files = selectPublishFiles({
    explicitFiles: options.files,
    headChangedFiles
  });
  const plan = createPublishPlan({
    branch: options.branch,
    files,
    localCommitSha,
    message,
    parentSha,
    repo: options.repo
  });

  console.log(formatPublishPlanSummary(plan));
  if (options.dryRun) {
    console.log("Dry run only. No GitHub ref was updated.");
    return;
  }

  const baseCommit = ghJson([`repos/${plan.repo}/git/commits/${parentSha}`]);
  const treeEntries = plan.files.map((path) => createTreeEntry(plan.repo, localCommitSha, path));
  const newTree = ghJson(
    [`repos/${plan.repo}/git/trees`, "-X", "POST", "--input", "-"],
    JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: treeEntries
    })
  );
  const newCommit = ghJson(
    [`repos/${plan.repo}/git/commits`, "-X", "POST", "--input", "-"],
    JSON.stringify({
      message: plan.message,
      parents: [parentSha],
      tree: newTree.sha
    })
  );
  const updated = ghJson(
    [`repos/${plan.repo}/git/refs/heads/${plan.branch}`, "-X", "PATCH", "--input", "-"],
    JSON.stringify({
      force: false,
      sha: newCommit.sha
    })
  );

  verifyRemoteTree(plan.repo, newCommit.sha, localCommitSha, plan.files);
  console.log(
    JSON.stringify(
      {
        branch: plan.branch,
        commit: newCommit.sha,
        files: plan.files,
        parent: parentSha,
        ref: updated.object.sha
      },
      null,
      2
    )
  );
}

function createTreeEntry(repo, commitSha, path) {
  const exists = spawnSync("git", ["cat-file", "-e", `${commitSha}:${path}`], {
    shell: useShell(),
    stdio: "ignore"
  }).status === 0;

  if (!exists) {
    return {
      path,
      sha: null
    };
  }

  const bytes = execFileSync("git", ["show", `${commitSha}:${path}`]);
  const blob = ghJson(
    [`repos/${repo}/git/blobs`, "-X", "POST", "--input", "-"],
    JSON.stringify({
      content: bytes.toString("base64"),
      encoding: "base64"
    })
  );

  return {
    mode: "100644",
    path,
    sha: blob.sha,
    type: "blob"
  };
}

function verifyRemoteTree(repo, remoteCommitSha, localCommitSha, files) {
  const remoteTree = ghJson([`repos/${repo}/git/trees/${remoteCommitSha}?recursive=1`]);
  const mismatches = [];
  for (const path of files) {
    const localExists = spawnSync("git", ["cat-file", "-e", `${localCommitSha}:${path}`], {
      shell: useShell(),
      stdio: "ignore"
    }).status === 0;
    const remoteEntry = remoteTree.tree.find((entry) => entry.path === path);

    if (!localExists) {
      if (remoteEntry) {
        mismatches.push(`${path}: expected deleted, remote has ${remoteEntry.sha}`);
      }
      continue;
    }

    const localSha = capture("git", ["rev-parse", `${localCommitSha}:${path}`]).trim();
    if (remoteEntry?.sha !== localSha) {
      mismatches.push(`${path}: local ${localSha}, remote ${remoteEntry?.sha ?? "missing"}`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Remote verification failed:\n${mismatches.join("\n")}`);
  }
}

function normalizeFileList(files) {
  return [...new Set(files.map((file) => file.trim().replaceAll("\\", "/")).filter(Boolean))];
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function assertCleanGitTree() {
  const status = capture("git", ["status", "--porcelain"]);
  if (status.trim()) {
    throw new Error(`API publish requires a clean git tree. Commit or stash local changes first.\n${status}`);
  }
}

function ghJson(args, input) {
  return JSON.parse(ghText(args, input));
}

function ghText(args, input) {
  const options = input === undefined ? { encoding: "utf8" } : { encoding: "utf8", input };
  return execFileSync("gh", ["api", ...args], options).trim();
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: useShell(),
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} ${args.join(" ")} failed.`);
  }
  return result.stdout;
}

function run(command, args, label) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    shell: useShell(),
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed.`);
  }
}

function printHelp() {
  console.log(`Usage:
  npm run release:publish:api -- [options]

Options:
  --repo <owner/name>        GitHub repo. Default: ${defaultRepo}
  --branch <branch>         Target branch. Default: ${defaultBranch}
  --commit <ref>            Local commit to publish. Default: HEAD
  --files <paths...>        Explicit files to publish. Default: files changed by the commit
  --skip-checks             Do not run npm run iteration:check first
  --dry-run                 Print the plan without updating GitHub

Use this only when normal git fetch/push cannot reach GitHub but gh api works.`);
}

function useShell() {
  return process.platform === "win32";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
