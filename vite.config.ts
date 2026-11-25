import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

function writeHealth(dir: string): void {
  mkdirSync(dir, { recursive: true });
  let commit = "unknown";
  try {
    commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    commit = "unknown";
  }
  const body = `${JSON.stringify(
    {
      status: "ok",
      service: "authclear",
      version: "0.1.0",
      commit,
      demo: "static",
      auth: "none",
    },
    null,
    2,
  )}\n`;
  writeFileSync(`${dir}/health.json`, body);
  writeFileSync(`${dir}/health`, body);
}

function healthPlugin(): Plugin {
  return {
    name: "authclear-health",
    buildStart() {
      writeHealth("public");
    },
    closeBundle() {
      writeHealth("dist");
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), healthPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
});
