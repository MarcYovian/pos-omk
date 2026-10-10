#!/usr/bin/env python3
"""
run_pipeline.py — Master Orchestrator for QA Documentation Suite
Executes the full 9-document generation pipeline across all 4 specialist skills.
"""

import os
import sys
import argparse
import subprocess

def main():
    parser = argparse.ArgumentParser(description="Master QA Suite Pipeline Runner")
    parser.add_argument("feature", nargs="?", default="f02", help="Feature key or code (e.g. f02, F-02)")
    parser.add_argument("--output-dir", help="Target output directory (default: docs/qa/<feature>)")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    args = parser.parse_args()

    feat = args.feature.lower().strip()
    if not args.output_dir:
        # Default folder name mapping
        dir_name = f"{feat}-feature" if not feat.startswith("f") else feat
        if feat == "f02":
            dir_name = "f02-pos-cashier"
        elif feat == "f01":
            dir_name = "f01-auth-rbac"
        out_dir = os.path.join("docs", "qa", dir_name)
    else:
        out_dir = args.output_dir

    print(f"\n🚀 Starting QA Documentation Suite for '{feat}' -> {out_dir}")
    os.makedirs(out_dir, exist_ok=True)

    # Resolve sibling skills dynamically
    skills_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    # 1. Spec Docs (00, 01, 02)
    spec_script = os.path.join(skills_dir, "qa-spec-and-scenario-skill", "scripts", "generate_spec_docs.py")
    if not os.path.exists(spec_script):
        spec_script = os.path.expanduser("~/.gemini/config/skills/qa-spec-and-scenario-skill/scripts/generate_spec_docs.py")
    if os.path.exists(spec_script):
        print("▶ Generating Stage 1, 2, 3: Feature Brief, Q&A, and BDD Scenarios...")
        subprocess.run(["python3", spec_script, "--feature", feat, "--output-dir", out_dir, "--project-root", args.project_root], check=True)

    # 2. UI Catalog Docs (03, 04, 05)
    ui_script = os.path.join(skills_dir, "qa-ui-cataloger-skill", "scripts", "generate_ui_catalog.py")
    if not os.path.exists(ui_script):
        ui_script = os.path.expanduser("~/.gemini/config/skills/qa-ui-cataloger-skill/scripts/generate_ui_catalog.py")
    if os.path.exists(ui_script):
        print("▶ Generating Stage 4, 5, 6: Screen Flow, Test Data, and Element Catalog...")
        subprocess.run(["python3", ui_script, "--feature", feat, "--output-dir", out_dir, "--project-root", args.project_root], check=True)

    # 3. Test Cases & POM Docs (06, 07, 08/09)
    case_script = os.path.join(skills_dir, "qa-test-case-and-runner-skill", "scripts", "generate_cases_and_pom.py")
    if not os.path.exists(case_script):
        case_script = os.path.expanduser("~/.gemini/config/skills/qa-test-case-and-runner-skill/scripts/generate_cases_and_pom.py")
    if os.path.exists(case_script):
        print("▶ Generating Stage 7, 8, 9: Detailed Test Cases, POM Blueprint, and Execution Report...")
        subprocess.run(["python3", case_script, "--feature", feat, "--output-dir", out_dir, "--project-root", args.project_root], check=True)

    # 4. Audit
    print("▶ Running Quality & Completeness Audit...")
    audit_script = os.path.join(os.path.dirname(__file__), "audit_docs.py")
    ret = subprocess.run(["python3", audit_script, out_dir])

    if ret.returncode == 0:
        print(f"\n✨ QA Suite Successfully Generated all 9 documents in {out_dir}!")
    else:
        print(f"\n⚠️ QA Suite completed with audit warnings. Check output above.")

if __name__ == "__main__":
    main()
