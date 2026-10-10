# AGENTS.md — Companion Guide for qa-spec-and-scenario-skill

## Overview
- **Skill Name:** `qa-spec-and-scenario-skill`
- **Activation:** `/qa-spec-and-scenario-skill`, `/qa-spec-plan`
- **Purpose:** Generates Stages 1, 2, and 3 QA documents (`00-feature-brief.md`, `01-questions-assumptions.md`, and `02-test-scenarios.md`).

## Core Instructions
1. Run `python3 scripts/generate_spec_docs.py --feature <feat> --output-dir <path>`.
2. Verify all PRD User Stories and Acceptance Criteria are codified into `S-XX` scenarios.
3. Pause for user review before proceeding to UI catalogs.
