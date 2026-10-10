---
name: qa-code-and-ui-analyzer-skill
activation: /qa-code-and-ui-analyzer-skill
description: >-
  Extracts comprehensive feature intelligence from PRD User Stories, User Flows,
  Vue 3 SFC templates, Pinia stores, Nitro APIs, and Supabase RPCs, combined with
  live browser DOM discovery via Playwright MCP. Outputs structured feature-analysis.json
  used by downstream QA document generators. Triggers on /qa-analyze, qa analyzer,
  ekstrak fitur qa, bedah fitur qa.
license: MIT
metadata:
  author: Senior QA Automation Team
  version: 1.0.0
  created: 2026-10-10
  last_reviewed: 2026-10-10
  review_interval_days: 90
provenance:
  maintainer: Senior QA Automation Team
  version: 1.0.0
  created: 2026-10-10
  source_references:
    - https://github.com/FrancyJGLisboa/agent-skill-creator
---

# /qa-code-and-ui-analyzer-skill — Codebase & Live UI Feature Discovery Engine

You are a **Senior QA Analyst & Codebase Reverse-Engineer**. Your mission is to extract complete, factual, and verified intelligence about a feature by triangulating three single sources of truth:
1. **Master Documentation:** `docs/PRD.md` (User Stories & AC BDD), `docs/USER_FLOWS.md`, `docs/UI_UX_SPECIFICATION.md`, and `docs/FEATURES.md`.
2. **Codebase Implementation:** Vue 3 SFC (`app/pages/`, `app/components/`), Pinia stores (`app/stores/`), Nitro REST endpoints (`server/api/`), and Supabase RPCs.
3. **Live Browser DOM (via Playwright MCP):** Runtime DOM inspection, accessibility trees, 48×48px touch bounding box validation, and real input interaction.

---

## Trigger

Activate when the user invokes:

```text
/qa-code-and-ui-analyzer-skill f02
/qa-analyze f02-pos-cashier
/qa-analyze /admin/umkm
Bedah fitur kasir pos untuk persiapan dokumen QA
Ekstrak metadata dan elemen DOM untuk fitur f01
```

---

## Core 3-Pillar Discovery Pipeline

```
┌────────────────────────────────────────────────────────┐
│               TRIANGULATION DISCOVERY ENGINE           │
├────────────────────────────────────────────────────────┤
│ 1. Documentation Ingestion (PRD, Flows, UX Specs)      │
│    Extracts User Stories, Acceptance Criteria (AC-XX)  │
│                                                        │
│ 2. Static Codebase Scanner (Vue, Pinia, RPC)           │
│    Extracts form inputs, action buttons, modals, RPCs  │
│                                                        │
│ 3. Live Browser Inspection (Playwright MCP)            │
│    Inspects live DOM, accessibility tree, 48px targets │
│                                                        │
│ 4. Synthesize into feature-analysis.json               │
│    Structured input for QA Document Generators         │
└────────────────────────────────────────────────────────┘
```

### Step 1: Run Static Feature Analyzer
Execute the analyzer script against the repository:

```bash
python3 .agents/skills/qa-code-and-ui-analyzer-skill/scripts/feature_analyzer.py --feature <feature_id> --output feature-analysis.json
```

### Step 2: Live Browser Inspection (via Playwright MCP)
If the local development server is active (`http://localhost:3000`):
1. Navigate to the feature route:
   `browser_navigate(url="http://localhost:3000/<route>")`
2. Capture the live accessibility tree:
   `browser_snapshot()`
3. Inspect rendered element dimensions for 48×48px touch compliance:
   `browser_evaluate(expression="Array.from(document.querySelectorAll('button, input')).map(el => ({ tag: el.tagName, text: el.innerText || el.placeholder, rect: el.getBoundingClientRect() }))")`

### Step 3: Handoff
Pass `feature-analysis.json` to downstream generators:
- `qa-spec-and-scenario-skill` for Documents 00, 01, 02.
- `qa-ui-cataloger-skill` for Documents 03, 04, 05.
- `qa-test-case-and-runner-skill` for Documents 06, 07, 08.
