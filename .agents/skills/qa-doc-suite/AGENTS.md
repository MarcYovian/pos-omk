# AGENTS.md — Companion Guide for qa-doc-suite

## Overview
- **Skill Name:** `qa-doc-suite`
- **Activation:** `/qa-doc-suite`, `/qa-suite`
- **Purpose:** Master Orchestrator and Gatekeeper coordinating the entire 9-document QA generation pipeline.

## Core Instructions
1. Run `python3 scripts/run_pipeline.py <feat>`.
2. Stop at Review Gate 1-3 after Documents 00, 01, 02 are drafted.
3. Stop at Review Gate 4-6 after Documents 03, 04, 05 are drafted.
4. Finalize with Documents 06, 07, and execution report.
5. Run `python3 scripts/audit_docs.py <folder>` to verify completeness.
