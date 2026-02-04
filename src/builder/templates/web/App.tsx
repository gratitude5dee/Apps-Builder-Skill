import type { BuildPlan } from "../../../skills/appsBuilderSkill/schema.js";

export function renderWebApp(plan: BuildPlan) {
  const toolNames = plan.tools.map((tool) => tool.name);
  return `import React, { useEffect, useState } from "react";
import { Button } from "@openai/apps-sdk-ui/components/Button";

const TOOL_NAMES = ${JSON.stringify(toolNames, null, 2)};
const APP_INFO = { name: "generated-app-ui", version: "0.1.0" };
const PROTOCOL_VERSION = "2026-01-26";

type ToolResult = {
  structuredContent?: {
    appName?: string;
    tool?: string;
    prompt?: string;
    message?: string;
  };
};

export default function App() {
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;
      if (message.method !== "ui/notifications/tool-result") return;
      setToolResult(message.params ?? null);
    };

    window.addEventListener("message", handler, { passive: true });
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    window.parent.postMessage(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "ui/initialize",
        params: {
          appInfo: APP_INFO,
          appCapabilities: {},
          protocolVersion: PROTOCOL_VERSION,
        },
      },
      "*"
    );
    window.parent.postMessage(
      { jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} },
      "*"
    );
  }, []);

  const content = toolResult?.structuredContent;

  return (
    <div className="app-shell">
      <header>
        <h1>{content?.appName ?? "ChatGPT App"}</h1>
        <p>Tools: {TOOL_NAMES.join(", ")}</p>
      </header>
      <section className="card">
        <h2>Latest Tool Result</h2>
        <p><strong>Tool:</strong> {content?.tool ?? ""}</p>
        <p><strong>Prompt:</strong> {content?.prompt ?? ""}</p>
        <p><strong>Message:</strong> {content?.message ?? ""}</p>
      </section>
      <section className="card">
        <h2>Next Steps</h2>
        <p>Use the chat to invoke tools. This widget will update with the latest results.</p>
        <Button variant="primary">Ask a follow-up in chat</Button>
      </section>
    </div>
  );
}
`;
}
