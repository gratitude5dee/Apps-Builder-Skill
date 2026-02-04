import React, { useEffect, useMemo, useState } from "react";
import { Card, List, ListItem } from "@ainativekit/ui";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";

const APP_INFO = { name: "apps-builder-ui", version: "0.1.0" };
const PROTOCOL_VERSION = "2026-01-26";

type ToolResult = {
  structuredContent?: {
    stage?: string;
    question?: { id: string; prompt: string; choices?: string[] } | null;
    requirements?: Record<string, unknown> | null;
    buildPlan?: Record<string, unknown> | null;
    deployment?: { provider?: string; url?: string; instructions?: string } | null;
    logs?: string[];
  };
};

let rpcId = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

function rpcRequest(method: string, params: any) {
  return new Promise((resolve, reject) => {
    const id = ++rpcId;
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
  });
}

function rpcNotify(method: string, params: any) {
  window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
}

function useToolResult() {
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;

      if (typeof message.id === "number") {
        const pendingRequest = pending.get(message.id);
        if (!pendingRequest) return;
        pending.delete(message.id);
        if (message.error) {
          pendingRequest.reject(message.error);
        } else {
          pendingRequest.resolve(message.result);
        }
        return;
      }

      if (message.method === "ui/notifications/tool-result") {
        setToolResult(message.params ?? null);
      }
    };

    window.addEventListener("message", handler, { passive: true });
    return () => window.removeEventListener("message", handler);
  }, []);

  return toolResult;
}

async function initializeBridge() {
  try {
    await rpcRequest("ui/initialize", {
      appInfo: APP_INFO,
      appCapabilities: {},
      protocolVersion: PROTOCOL_VERSION,
    });
    rpcNotify("ui/notifications/initialized", {});
  } catch (error) {
    console.error("Failed to initialize bridge", error);
  }
}

export default function App() {
  const toolResult = useToolResult();
  const content = toolResult?.structuredContent ?? {};
  const logs = content.logs ?? [];
  const stage = content.stage ?? "collecting";

  useEffect(() => {
    initializeBridge();
  }, []);

  const buildPlan = content.buildPlan ?? {};
  const question = content.question ?? null;
  const deployment = content.deployment ?? {};

  const planLines = useMemo(() => {
    if (!buildPlan || !Object.keys(buildPlan).length) return [];
    return Object.entries(buildPlan).map(([key, value]) => {
      const display = Array.isArray(value) ? value.join(", ") : String(value);
      return `${key}: ${display}`;
    });
  }, [buildPlan]);

  return (
    <div className="builder-shell">
      <header className="header">
        <div>
          <h1>Apps Builder</h1>
          <p>Stage: <Badge>{stage}</Badge></p>
        </div>
        <div className="actions">
          <Button
            variant="secondary"
            onClick={() =>
              rpcRequest("tools/call", {
                name: "apps_builder_interview",
                arguments: { command: "restart" },
              })
            }
          >
            Restart
          </Button>
          <Button
            variant="primary"
            disabled={stage !== "confirm"}
            onClick={() =>
              rpcRequest("tools/call", {
                name: "apps_builder_generate",
                arguments: { confirm: true },
              })
            }
          >
            Generate + deploy
          </Button>
        </div>
      </header>

      {question && (
        <Card elevationLevel={1} className="section">
          <Card.Title>{question.prompt}</Card.Title>
          {question.choices && question.choices.length > 0 && (
            <Card.Description>
              Choices: {question.choices.join(", ")}
            </Card.Description>
          )}
          <Card.Description>
            Answer in chat to continue the interview.
          </Card.Description>
        </Card>
      )}

      <Card elevationLevel={1} className="section">
        <Card.Title>Build Plan</Card.Title>
        {planLines.length === 0 ? (
          <Card.Description>Waiting for requirements.</Card.Description>
        ) : (
          <List
            items={planLines}
            renderItem={(item: string) => <ListItem title={item} />}
          />
        )}
      </Card>

      <Card elevationLevel={1} className="section">
        <Card.Title>Deployment</Card.Title>
        <Card.Description>Provider: {deployment.provider ?? ""}</Card.Description>
        {deployment.url && (
          <Card.Description>URL: {deployment.url}</Card.Description>
        )}
        {deployment.instructions && (
          <Card.Description>{deployment.instructions}</Card.Description>
        )}
      </Card>

      <Card elevationLevel={1} className="section">
        <Card.Title>Logs</Card.Title>
        {logs.length === 0 ? (
          <Card.Description>No logs yet.</Card.Description>
        ) : (
          <List
            items={logs}
            renderItem={(item: string) => <ListItem title={item} />}
          />
        )}
      </Card>
    </div>
  );
}
