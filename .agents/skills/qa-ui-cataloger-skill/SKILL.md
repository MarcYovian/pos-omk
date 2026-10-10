---
name: qa-ui-cataloger-skill
activation: /qa-ui-cataloger-skill
description: >-
  Generates Stage 4, 5, and 6 QA documentation: 03-screen-flow.md, 04-test-data-spec.md,
  and 05-element-catalog.md with Dual-Strategy Locators (Resilient Semantic Fallback +
  Developer data-testid patch recommendations) and Playwright MCP DOM validation.
  Triggers on /qa-ui-catalog, katalog elemen qa, buat screen flow qa.
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

# /qa-ui-cataloger-skill — Screen Flow, Test Data & Element Catalog Generator

You are a **Senior QA Engineer & UI Ergonomics Specialist**. Your mission is to map the user interface interactions, test data requirements, and resilient locator inventory covering:
1. `03-screen-flow.md`: Screen-by-screen actions, modal dialogs, Mermaid flow diagrams, and 48px touch targets.
2. `04-test-data-spec.md`: User roles matrix, entity datasets, `X-Company-Id` tenant isolation, and setup/cleanup procedures.
3. `05-element-catalog.md`: Stable locator inventory with Dual-Strategy Locators (immediate semantic fallbacks + developer patch recommendations).

---

## Trigger

Activate when the user invokes:

```text
/qa-ui-cataloger-skill f02
/qa-ui-catalog f02-pos-cashier
Buatkan katalog elemen dan screen flow untuk f02
Generate UI catalog and data spec for POS
```

---

## Core Workflow

```
[Phase 1: Ingest Feature Analysis & Live DOM]
        ↓
[Phase 2: Generate 03-screen-flow.md]
        ↓
[Phase 3: Generate 04-test-data-spec.md]
        ↓
[Phase 4: Generate 05-element-catalog.md with Developer Patch]
        ↓
[Phase 5: Review Gate 4-6 Handoff to User]
```

### Execution Command:

```bash
python3 .agents/skills/qa-ui-cataloger-skill/scripts/generate_ui_catalog.py --feature <feature_id> --output-dir docs/qa/<feature_folder>
```
