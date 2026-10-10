# Eval Spec: qa-ui-cataloger-skill

The skill's loss function: structural binary checks for Stage 4, 5, 6 QA document generation.

## Criteria

1. **generated-files-exist** (command) — verify 03, 04, and 05 exist in output directory.
2. **has-locator-inventory** (command) — verify 05-element-catalog.md has table and data-testid.
3. **has-developer-patch-section** (command) — verify 05-element-catalog.md has developer recommendation section.

## Spec

```json
{
  "skill": "qa-ui-cataloger-skill",
  "run": "python3 scripts/generate_ui_catalog.py --feature f02 --output-dir /tmp/test-ui-eval && ls /tmp/test-ui-eval > {output}",
  "criteria": [
    {
      "id": "generated-files-exist",
      "text": "All three UI catalog files are created",
      "type": "command",
      "cmd": "test -f /tmp/test-ui-eval/03-screen-flow.md && test -f /tmp/test-ui-eval/04-test-data-spec.md && test -f /tmp/test-ui-eval/05-element-catalog.md"
    },
    {
      "id": "has-locator-inventory",
      "text": "Element catalog contains locator table",
      "type": "command",
      "cmd": "grep -q 'data-testid' /tmp/test-ui-eval/05-element-catalog.md && grep -q 'Fallback Selector' /tmp/test-ui-eval/05-element-catalog.md"
    },
    {
      "id": "has-developer-patch-section",
      "text": "Element catalog contains developer patch section",
      "type": "command",
      "cmd": "grep -q 'Rekomendasi Patch' /tmp/test-ui-eval/05-element-catalog.md"
    }
  ],
  "golden": [
    {"id": "case-1", "input": "f02", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-2", "input": "f01", "expected": null, "split": "test", "expected_status": "pending-first-green"},
    {"id": "case-3", "input": "f04", "expected": null, "split": "val", "expected_status": "pending-first-green"}
  ]
}
```
