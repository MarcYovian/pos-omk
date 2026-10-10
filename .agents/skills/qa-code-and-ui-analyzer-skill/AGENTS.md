# AGENTS.md — Companion Guide for qa-code-and-ui-analyzer-skill

This file provides agentic execution context for `qa-code-and-ui-analyzer-skill` following the Linux Foundation Agentic AI format.

## Overview
- **Skill Name:** `qa-code-and-ui-analyzer-skill`
- **Activation:** `/qa-code-and-ui-analyzer-skill`, `/qa-analyze`
- **Purpose:** Triangulates master docs (`PRD.md`, `USER_FLOWS.md`), source code (`app/pages/`, `app/stores/`), and live browser DOM (via Playwright MCP) into `feature-analysis.json`.

## Core Instructions
1. Run `python3 scripts/feature_analyzer.py --feature <id> --output feature-analysis.json`.
2. If dev server is running, use Playwright MCP `browser_navigate` and `browser_snapshot` to inspect DOM state.
3. Validate output JSON contains `prd`, `user_flows`, `components`, `stores`, and `recommended_testids`.
4. Provide structured summary to user or hand off to `qa-spec-and-scenario-skill`.
