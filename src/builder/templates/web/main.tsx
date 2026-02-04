export function renderWebMain() {
  return `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "@openai/apps-sdk-ui/css";

const root = document.getElementById("app-root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
`;
}
