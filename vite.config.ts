import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

function normalizedModuleId(id: string) {
  return id.replaceAll("\\", "/");
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = normalizedModuleId(id);

          if (
            moduleId.includes("/node_modules/react") ||
            moduleId.includes("/node_modules/react-dom") ||
            moduleId.includes("/node_modules/scheduler")
          ) {
            return "react-vendor";
          }

          if (moduleId.includes("/node_modules/lucide-react")) {
            return "icons-vendor";
          }

          if (moduleId.includes("/src/playtest/journey")) {
            return "journey-runtime";
          }

          if (
            moduleId.includes("/src/playtest/sim") ||
            moduleId.includes("/src/playtest/progression") ||
            moduleId.includes("/src/playtest/reports")
          ) {
            return "playtest-runtime";
          }

          if (moduleId.includes("/src/game/")) {
            return "game-runtime";
          }
        }
      }
    }
  },
  plugins: [react()],
  test: {
    environment: "node",
    globals: true
  }
});
