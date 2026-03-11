export function renderPackageJson(appSlug: string, _appName: string) {
  const pkg = {
    name: appSlug,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "concurrently -n server,web \"pnpm dev:server\" \"pnpm dev:web\"",
      "dev:server": "tsx watch src/index.ts",
      "dev:web": "pnpm --dir web dev",
      build: "pnpm build:server && pnpm build:web",
      "build:server": "tsc -p tsconfig.json",
      "build:web": "pnpm --dir web build",
      benchmark: "tsx src/benchmark.ts",
      lint: "eslint . --ext .ts,.tsx",
      test: "vitest run",
      typecheck: "tsc -p tsconfig.json --noEmit",
    },
    dependencies: {
      "@modelcontextprotocol/ext-apps": "^1.0.1",
      "@modelcontextprotocol/sdk": "^1.20.2",
      express: "^4.19.2",
      zod: "^3.25.76",
    },
    devDependencies: {
      "@eslint/js": "^9.8.0",
      "@types/express": "^4.17.21",
      "@types/node": "^20.14.10",
      concurrently: "^9.0.1",
      eslint: "^9.8.0",
      tsx: "^4.20.5",
      typescript: "^5.6.3",
      "typescript-eslint": "^8.4.0",
      vitest: "^2.0.5",
    },
  };

  return JSON.stringify(pkg, null, 2);
}
