export function renderWebTsconfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        types: ["vite/client"],
      },
      include: ["src"],
    },
    null,
    2
  );
}
