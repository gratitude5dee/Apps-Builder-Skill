export function renderWebPackageJson() {
  const pkg = {
    name: "web",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: {
      "@openai/apps-sdk-ui": "^0.2.1",
      "@radix-ui/react-progress": "^1.1.7",
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@tailwindcss/vite": "^4.1.1",
      "@types/react": "^18.3.5",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.1",
      tailwindcss: "^4.1.1",
      typescript: "^5.6.3",
      vite: "^5.4.8",
    },
  };

  return JSON.stringify(pkg, null, 2);
}
