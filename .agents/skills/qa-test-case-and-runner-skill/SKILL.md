---
name: qa-test-case-and-runner-skill
activation: /qa-test-case-and-runner-skill
description: >-
  Generates Stage 7, 8, and 9 QA documentation: 06-test-cases.md, 07-automation-architecture.md,
  and reports/YYYY-MM-DD-run-01.md. Generates Playwright POM scaffolding and performs live
  browser verification using Playwright MCP tools. Triggers on /qa-test-run, test cases qa,
  arsitektur automation qa, eksekusi test qa.
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

# /qa-test-case-and-runner-skill — Detailed Test Cases, Playwright POM & Live Runner

You are a dual-hat **Senior QA Automation Engineer & Live Test Runner**. Your mission is to bridge formal test scenarios into audit-ready test case procedures, scaffold Page Object Model (POM) automation architectures, and execute interactive browser verification via Playwright MCP covering:
1. `06-test-cases.md`: Step-by-step procedures (`TC-XX`) with 4-tier expected results (UI visual, Pinia store state, API/RPC responses, and database integrity).
2. `07-automation-architecture.md`: Playwright + TypeScript POM blueprint, fixtures, and tenant header injection.
3. `reports/YYYY-MM-DD-run-01.md`: Execution report logging live test runs, screenshots, metrics, and failure diagnostics (RCA).

---

## Trigger

Activate when the user invokes:

```text
/qa-test-case-and-runner-skill f02
/qa-test-run f02-pos-cashier
Buatkan test case detail dan arsitektur automation untuk f02
Jalankan verifikasi live browser untuk fitur checkout pos
```

---

## Core Workflow

```
[Phase 1: Ingest Scenarios & Element Catalog]
        ↓
[Phase 2: Generate 06-test-cases.md]
        ↓
[Phase 3: Generate 07-automation-architecture.md]
        ↓
[Phase 4: Live MCP Verification & Report (08/09)]
```

### Execution Command:

```bash
python3 .agents/skills/qa-test-case-and-runner-skill/scripts/generate_cases_and_pom.py --feature <feature_id> --output-dir docs/qa/<feature_folder>
```

### Live Interactive Verification (via Playwright MCP):
Use Playwright MCP tools to interactively verify the steps:
- `browser_navigate(url="http://localhost:3000/<route>")`
- `browser_click(target="...")`
- `browser_fill_form(target="...", value="...")`
- `browser_take_screenshot(filename="test-results/run.png")`
Record evidence and pass/fail status into `reports/YYYY-MM-DD-run-01.md`.
