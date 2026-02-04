export function renderTsconfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        rootDir: "src",
        outDir: "dist",
        lib: ["ES2022"],
        types: ["node"],
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "web", "dist"],
    },
    null,
    2
  );
}
