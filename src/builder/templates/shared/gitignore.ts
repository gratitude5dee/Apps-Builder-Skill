export function renderGitignore() {
  return [
    "node_modules/",
    "dist/",
    "web/dist/",
    ".supreme/",
    ".env",
    ".DS_Store",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
  ].join("\n");
}
