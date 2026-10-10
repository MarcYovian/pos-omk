# AGENTS.md — Companion Guide for qa-test-case-and-runner-skill

## Overview
- **Skill Name:** `qa-test-case-and-runner-skill`
- **Activation:** `/qa-test-case-and-runner-skill`, `/qa-test-run`
- **Purpose:** Generates Stages 7, 8, and 9 QA documents (`06-test-cases.md`, `07-automation-architecture.md`, and `reports/YYYY-MM-DD-run-01.md`).

## Core Instructions
1. Run `python3 scripts/generate_cases_and_pom.py --feature <feat> --output-dir <path>`.
2. Map all test cases `TC-XX` directly to scenario IDs `S-XX`.
3. If running live browser checks, invoke Playwright MCP tools (`browser_click`, `browser_fill_form`, `browser_take_screenshot`) and record results to `reports/`.
