# AGENTS.md — Companion Guide for qa-ui-cataloger-skill

## Overview
- **Skill Name:** `qa-ui-cataloger-skill`
- **Activation:** `/qa-ui-cataloger-skill`, `/qa-ui-catalog`
- **Purpose:** Generates Stages 4, 5, and 6 QA documents (`03-screen-flow.md`, `04-test-data-spec.md`, and `05-element-catalog.md`).

## Core Instructions
1. Run `python3 scripts/generate_ui_catalog.py --feature <feat> --output-dir <path>`.
2. Inspect live DOM via Playwright MCP if dev server is running to verify 48px touch targets.
3. Include Dual-Strategy Locators and developer patch recommendations in `05-element-catalog.md`.
