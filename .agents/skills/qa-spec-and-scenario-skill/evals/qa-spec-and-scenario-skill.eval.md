# Eval Spec: qa-spec-and-scenario-skill

The skill's loss function: structural binary checks for Stage 1, 2, 3 QA document generation.

## Criteria

1. **generated-files-exist** (command) — verify 00, 01, and 02 exist in output.
2. **has-gwt-scenarios** (command) — verify 02-test-scenarios.md contains Given-When-Then scenarios.
3. **has-feature-brief-headers** (command) — verify 00-feature-brief.md contains metadata and alur ringkas.

## Spec

```json
{
  "skill": "qa-spec-and-scenario-skill",
  "run": "python3 scripts/generate_spec_docs.py --feature f02 --output-dir /tmp/test-spec-eval && ls /tmp/test-spec-eval > {output}",
  "criteria": [
    {
      "id": "generated-files-exist",
      "text": "All three spec files are created",
      "type": "command",
      "cmd": "test -f /tmp/test-spec-eval/00-feature-brief.md && test -f /tmp/test-spec-eval/01-questions-assumptions.md && test -f /tmp/test-spec-eval/02-test-scenarios.md"
    },
    {
      "id": "has-gwt-scenarios",
      "text": "Scenarios file contains S-01 and Given",
      "type": "command",
      "cmd": "grep -q 'S-01' /tmp/test-spec-eval/02-test-scenarios.md && grep -q 'Given' /tmp/test-spec-eval/02-test-scenarios.md"
    },
    {
      "id": "has-feature-brief-headers",
      "text": "Feature brief contains metadata table",
      "type": "command",
      "cmd": "grep -q 'Feature Brief' /tmp/test-spec-eval/00-feature-brief.md && grep -q 'Metadata Fitur' /tmp/test-spec-eval/00-feature-brief.md"
    }
  ],
  "golden": [
    {"id": "case-1", "input": "f02", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-2", "input": "f01", "expected": null, "split": "test", "expected_status": "pending-first-green"},
    {"id": "case-3", "input": "f04", "expected": null, "split": "val", "expected_status": "pending-first-green"}
  ]
}
```
