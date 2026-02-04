---
name: chatgpt-apps-builder
description: Build ChatGPT Apps SDK projects by interviewing users, generating scaffolds, validating outputs, and deploying via Netlify/Cloudflare/Vercel. Use when creating new Apps SDK app scaffolds, updating generator templates, or troubleshooting Apps Builder output.
---

# ChatGPT Apps Builder

## Overview

Generate Apps SDK projects end-to-end: collect requirements, scaffold the app, validate files, and deploy with MCP adapters or CLI fallback.

## Workflow

1. Gather requirements using the ordered interview flow (5-8 questions max).
2. Generate the app into `generated/<slug>/` using templates under `src/builder/templates/`.
3. Validate the generated project via `src/builder/validate.ts`.
4. Deploy through MCP adapters in `src/deploy/providers/`, or provide CLI fallback steps.
5. Return the deployment URL and Developer Mode instructions.

## Key Paths

- Builder logic: `apps-builder-skill/src/skills/appsBuilderSkill/`
- Templates: `apps-builder-skill/src/builder/templates/`
- Builder UI: `apps-builder-skill/web/`
- Generated output: `apps-builder-skill/generated/`

## Quality Bar

- Keep the interview fast and non-repetitive; skip questions already inferred.
- Never log secret values; only log secret names.
- Ensure `apps_builder_generate` returns a URL or explicit fallback instructions.
