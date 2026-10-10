# Eval Spec: qa-doc-suite

The skill's loss function: structural binary checks for full pipeline orchestration and audit verification.

## Criteria

1. **audit-script-runs** (command) — verify audit_docs.py evaluates documentation directory.
2. **pipeline-generates-suite** (command) — verify run_pipeline.py generates full suite.

## Spec

```json
{
  "skill": "qa-doc-suite",
  "run": "python3 scripts/run_pipeline.py f02 --output-dir /tmp/test-suite-eval && ls /tmp/test-suite-eval > {output}",
  "criteria": [
    {
      "id": "pipeline-generates-suite",
      "text": "Pipeline creates full 9 documents",
      "type": "command",
      "cmd": "test -f /tmp/test-suite-eval/00-feature-brief.md && test -f /tmp/test-suite-eval/05-element-catalog.md && test -f /tmp/test-suite-eval/07-automation-architecture.md"
    },
    {
      "id": "audit-script-runs",
      "text": "Audit tool validates output folder without errors",
      "type": "command",
      "cmd": "python3 scripts/audit_docs.py /tmp/test-suite-eval"
    }
  ],
  "golden": [
    {"id": "case-1", "input": "f02", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-2", "input": "f01", "expected": null, "split": "test", "expected_status": "pending-first-green"},
    {"id": "case-3", "input": "f04", "expected": null, "split": "val", "expected_status": "pending-first-green"}
  ]
}
```
