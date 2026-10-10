#!/usr/bin/env python3
"""
run_pipeline.py — Pipeline runner for qa-code-and-ui-analyzer-skill
"""

import sys
import subprocess

def main():
    feat = sys.argv[1] if len(sys.argv) > 1 else "f02"
    cmd = ["python3", "scripts/feature_analyzer.py", "--feature", feat]
    ret = subprocess.run(cmd)
    sys.exit(ret.returncode)

if __name__ == "__main__":
    main()
