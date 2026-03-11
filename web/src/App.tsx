import React, { startTransition, useEffect, useState } from "react";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";

const APP_INFO = { name: "apps-builder-ui", version: "0.2.0" };
const PROTOCOL_VERSION = "2026-01-26";

type Question = { id: string; prompt: string; choices?: string[] } | null;
type Gate = {
  id: string;
  label: string;
  blocking: boolean;
  passed: boolean;
  details: string;
};
type BenchmarkTask = {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
};
type Iteration = {
  index: number;
  appSlug: string;
  projectDir: string;
  status: "passed" | "failed";
  notes: string[];
  validation: { summary: string; gates: Gate[] };
  benchmark: {
    passRate: number;
    score: number;
    maxScore: number;
    tasks: BenchmarkTask[];
  };
};

type StructuredContent = {
  stage?: string;
  question?: Question;
  requirements?: Record<string, unknown> | null;
  buildPlan?: Record<string, unknown> | null;
  deployment?: { provider?: string; url?: string; instructions?: string } | null;
  logs?: string[];
  completeness?: {
    answered: number;
    total: number;
    percent: number;
    missing: string[];
    ready: boolean;
  } | null;
  spec?: {
    appName?: string;
    appDescription?: string;
    targetUsers?: string;
    successMetric?: string;
    stackPreset?: string;
  } | null;
  validation?: { summary: string; gates: Gate[] } | null;
  benchmark?: {
    passRate: number;
    score: number;
    maxScore: number;
    widgetRenderTimeMs: number;
    tasks: BenchmarkTask[];
  } | null;
  artifacts?: Record<string, string> | null;
  iterations?: Iteration[];
};

type ToolResult = {
  structuredContent?: StructuredContent;
};

let rpcId = 0;
const pending = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (error: unknown) => void }
>();

function rpcRequest(method: string, params: unknown) {
  return new Promise((resolve, reject) => {
    const id = ++rpcId;
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
  });
}

function rpcNotify(method: string, params: unknown) {
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
        const active = pending.get(message.id);
        if (!active) return;
        pending.delete(message.id);
        if (message.error) {
          active.reject(message.error);
        } else {
          active.resolve(message.result);
        }
        return;
      }

      if (message.method === "ui/notifications/tool-result") {
        startTransition(() => {
          setToolResult(message.params ?? null);
        });
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

function objectLines(record?: Record<string, unknown> | null) {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({
    key,
    value: Array.isArray(value) ? value.join(", ") : String(value),
  }));
}

export default function App() {
  const toolResult = useToolResult();
  const content = toolResult?.structuredContent ?? {};
  const logs = content.logs ?? [];
  const stage = content.stage ?? "collecting";
  const completeness = content.completeness;
  const deployment = content.deployment ?? {};
  const spec = content.spec ?? {};
  const validation = content.validation;
  const benchmark = content.benchmark;
  const iterations = content.iterations ?? [];
  const question = content.question;
  const buildPlanLines = objectLines(content.buildPlan);
  const artifactLines = objectLines(content.artifacts);

  useEffect(() => {
    initializeBridge();
  }, []);

  return (
    <div className="builder-page">
      <div className="builder-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">SupremeAppsBuilder v2</p>
            <h1>Adaptive ChatGPT app factory</h1>
            <p className="lede">
              Tracks spec completeness, refinement iterations, validation gates,
              smoke benchmark results, and deployment guidance in one place.
            </p>
          </div>
          <div className="hero-actions">
            <Badge>{stage}</Badge>
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
              Generate
            </Button>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card stat-dark">
            <span>Spec completeness</span>
            <strong>{completeness?.percent ?? 0}%</strong>
            <small>
              {completeness ? `${completeness.answered}/${completeness.total}` : "0/7"}
            </small>
          </article>
          <article className="stat-card">
            <span>Iterations</span>
            <strong>{iterations.length}</strong>
            <small>{iterations.at(-1)?.status ?? "idle"}</small>
          </article>
          <article className="stat-card">
            <span>Benchmark</span>
            <strong>{benchmark?.passRate ?? 0}%</strong>
            <small>
              {benchmark ? `${benchmark.score}/${benchmark.maxScore}` : "waiting"}
            </small>
          </article>
          <article className="stat-card">
            <span>Deployment</span>
            <strong>{deployment.provider ?? "local"}</strong>
            <small>{deployment.url ?? "instructions pending"}</small>
          </article>
        </section>

        {question && (
          <section className="panel accent">
            <h2>Next question</h2>
            <p>{question.prompt}</p>
            {question.choices && question.choices.length > 0 && (
              <p className="muted">Choices: {question.choices.join(", ")}</p>
            )}
            <p className="muted">Answer in chat to continue the interview.</p>
          </section>
        )}

        <section className="two-up">
          <article className="panel">
            <h2>Spec</h2>
            <div className="kv-grid">
              <div>
                <span>Name</span>
                <strong>{spec.appName ?? "Waiting"}</strong>
              </div>
              <div>
                <span>Users</span>
                <strong>{spec.targetUsers ?? "Waiting"}</strong>
              </div>
              <div>
                <span>Success</span>
                <strong>{spec.successMetric ?? "Waiting"}</strong>
              </div>
              <div>
                <span>Stack</span>
                <strong>{spec.stackPreset ?? "mcp_apps_kit_react"}</strong>
              </div>
            </div>
            {spec.appDescription && <p className="muted">{spec.appDescription}</p>}
          </article>

          <article className="panel">
            <h2>Build plan</h2>
            {buildPlanLines.length === 0 ? (
              <p className="muted">Waiting for a complete spec.</p>
            ) : (
              <ul className="detail-list">
                {buildPlanLines.map((entry) => (
                  <li key={entry.key}>
                    <strong>{entry.key}</strong>
                    <span>{entry.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="two-up">
          <article className="panel">
            <h2>Validation</h2>
            {!validation ? (
              <p className="muted">Validation gates appear after generation.</p>
            ) : (
              <>
                <p className="muted">{validation.summary}</p>
                <ul className="gate-list">
                  {validation.gates.map((gate) => (
                    <li key={gate.id} className={gate.passed ? "pass" : "fail"}>
                      <div>
                        <strong>{gate.label}</strong>
                        <span>{gate.blocking ? "blocking" : "advisory"}</span>
                      </div>
                      <p>{gate.details}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>

          <article className="panel">
            <h2>Benchmark</h2>
            {!benchmark ? (
              <p className="muted">Smoke benchmark runs after validation.</p>
            ) : (
              <>
                <p className="muted">
                  Pass rate {benchmark.passRate}% with widget render estimate{" "}
                  {benchmark.widgetRenderTimeMs}ms.
                </p>
                <ul className="detail-list">
                  {benchmark.tasks.map((task) => (
                    <li key={task.id}>
                      <strong>{task.label}</strong>
                      <span>
                        {task.passed ? "pass" : "fail"} ({task.score}/{task.maxScore})
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        </section>

        <section className="panel">
          <h2>Iterations</h2>
          {iterations.length === 0 ? (
            <p className="muted">No generation iterations yet.</p>
          ) : (
            <ul className="iteration-list">
              {iterations.map((iteration) => (
                <li key={iteration.index}>
                  <div>
                    <strong>
                      Iteration {iteration.index} · {iteration.appSlug}
                    </strong>
                    <span>{iteration.status}</span>
                  </div>
                  <p>{iteration.projectDir}</p>
                  {iteration.notes.length > 0 && (
                    <p className="muted">{iteration.notes.join(" ")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="two-up">
          <article className="panel">
            <h2>Deployment</h2>
            <div className="detail-list plain">
              <div>
                <strong>Provider</strong>
                <span>{deployment.provider ?? "local"}</span>
              </div>
              <div>
                <strong>URL</strong>
                <span>{deployment.url ?? "Not yet available"}</span>
              </div>
            </div>
            {deployment.instructions && (
              <pre className="instruction-box">{deployment.instructions}</pre>
            )}
          </article>

          <article className="panel">
            <h2>Artifacts</h2>
            {artifactLines.length === 0 ? (
              <p className="muted">Artifacts appear after generation.</p>
            ) : (
              <ul className="detail-list">
                {artifactLines.map((entry) => (
                  <li key={entry.key}>
                    <strong>{entry.key}</strong>
                    <span>{entry.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="panel">
          <h2>Logs</h2>
          {logs.length === 0 ? (
            <p className="muted">No logs yet.</p>
          ) : (
            <ul className="log-list">
              {logs.map((log, index) => (
                <li key={`${log}-${index}`}>{log}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
