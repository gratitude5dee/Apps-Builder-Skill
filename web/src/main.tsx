import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppsSDKUIProvider } from "@ainativekit/ui";
import "./styles.css";
import "@openai/apps-sdk-ui/css";
import "@ainativekit/ui/styles";

const root = document.getElementById("apps-builder-root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AppsSDKUIProvider>
        <App />
      </AppsSDKUIProvider>
    </React.StrictMode>
  );
}
