#!/usr/bin/env python3
"""
run_pipeline.py — Pipeline runner for qa-spec-and-scenario-skill
"""

import sys
import subprocess

def main():
    feat = sys.argv[1] if len(sys.argv) > 1 else "f02"
    out_dir = sys.argv[2] if len(sys.argv) > 2 else f"docs/qa/{feat}"
    cmd = ["python3", "scripts/generate_spec_docs.py", "--feature", feat, "--output-dir", out_dir]
    ret = subprocess.run(cmd)
    sys.exit(ret.returncode)

if __name__ == "__main__":
    main()
