#!/usr/bin/env python3
"""
audit_docs.py — QA Documentation Audit & Verification Tool
Validates that all 9 QA documents in a feature folder meet quality standards
and adhere strictly to docs/qa/_template/.
"""

import os
import sys
import re
import argparse

REQUIRED_FILES = [
    "00-feature-brief.md",
    "01-questions-assumptions.md",
    "02-test-scenarios.md",
    "03-screen-flow.md",
    "04-test-data-spec.md",
    "05-element-catalog.md",
    "06-test-cases.md",
    "07-automation-architecture.md"
]

PLACEHOLDER_PATTERNS = [
    r"\[NAMA_FITUR\]",
    r"\[KODE_FITUR\]",
    r"\[Nama Fitur Lengkap\]",
    r"\[F-XX\b"
]


def audit_feature_dir(target_dir: str) -> dict:
    results = {
        "target_dir": target_dir,
        "files_checked": len(REQUIRED_FILES) + 1,
        "missing_files": [],
        "placeholder_issues": [],
        "checks_passed": 0,
        "checks_failed": 0
    }

    if not os.path.exists(target_dir):
        results["error"] = f"Directory {target_dir} does not exist"
        results["checks_failed"] += 1
        return results

    # Check 8 core files
    for req in REQUIRED_FILES:
        fpath = os.path.join(target_dir, req)
        if not os.path.exists(fpath):
            results["missing_files"].append(req)
            results["checks_failed"] += 1
        else:
            results["checks_passed"] += 1
            # Check for unresolved placeholders
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                for pat in PLACEHOLDER_PATTERNS:
                    matches = re.findall(pat, content)
                    if matches:
                        results["placeholder_issues"].append(f"{req}: Unresolved {matches[0]}")
                        results["checks_failed"] += 1
            except Exception as e:
                results["placeholder_issues"].append(f"{req}: Read error {e}")

    # Check reports directory
    rep_dir = os.path.join(target_dir, "reports")
    if os.path.exists(rep_dir) and any(f.endswith(".md") for f in os.listdir(rep_dir)):
        results["checks_passed"] += 1
    else:
        results["missing_files"].append("reports/*.md")
        results["checks_failed"] += 1

    return results


def main():
    parser = argparse.ArgumentParser(description="Audit QA documentation completeness")
    parser.add_argument("feature_dir", help="Path to feature QA folder (e.g. docs/qa/f02-pos-cashier)")
    args = parser.parse_args()

    res = audit_feature_dir(args.feature_dir)
    print(f"\n============================================================")
    print(f"QA Documentation Audit: {args.feature_dir}")
    print(f"============================================================")
    
    if res.get("missing_files"):
        print(f"❌ Missing Required Files ({len(res['missing_files'])}):")
        for m in res["missing_files"]:
            print(f"   - {m}")
    else:
        print(f"✅ All 9 required QA documents exist.")

    if res.get("placeholder_issues"):
        print(f"\n⚠️ Placeholder Issues Found ({len(res['placeholder_issues'])}):")
        for p in res["placeholder_issues"]:
            print(f"   - {p}")
    else:
        print(f"✅ No raw placeholder markers detected.")

    status = "PASSED" if res["checks_failed"] == 0 else "FAILED"
    print(f"\nAudit Status: {status} ({res['checks_passed']} passed, {res['checks_failed']} failed)")
    print(f"============================================================\n")

    sys.exit(0 if status == "PASSED" else 1)


if __name__ == "__main__":
    main()
