# Eval Spec: qa-test-case-and-runner-skill

The skill's loss function: structural binary checks for Stage 7, 8, 9 QA document generation.

## Criteria

1. **generated-files-exist** (command) — verify 06, 07, and execution report exist in output.
2. **has-test-cases-steps** (command) — verify 06-test-cases.md contains TC-01 and test steps.
3. **has-pom-class** (command) — verify 07-automation-architecture.md contains TypeScript Page Object class.

## Spec

```json
{
  "skill": "qa-test-case-and-runner-skill",
  "run": "python3 scripts/generate_cases_and_pom.py --feature f02 --output-dir /tmp/test-runner-eval && ls /tmp/test-runner-eval > {output}",
  "criteria": [
    {
      "id": "generated-files-exist",
      "text": "All test case and POM files are created",
      "type": "command",
      "cmd": "test -f /tmp/test-runner-eval/06-test-cases.md && test -f /tmp/test-runner-eval/07-automation-architecture.md && ls /tmp/test-runner-eval/reports/*.md"
    },
    {
      "id": "has-test-cases-steps",
      "text": "Test cases file contains TC-01 and steps",
      "type": "command",
      "cmd": "grep -q 'TC-01' /tmp/test-runner-eval/06-test-cases.md && grep -q 'Langkah-langkah' /tmp/test-runner-eval/06-test-cases.md"
    },
    {
      "id": "has-pom-class",
      "text": "Automation architecture contains Page Object class",
      "type": "command",
      "cmd": "grep -q 'class F02Page' /tmp/test-runner-eval/07-automation-architecture.md && grep -q 'export class' /tmp/test-runner-eval/07-automation-architecture.md"
    }
  ],
  "golden": [
    {"id": "case-1", "input": "f02", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-2", "input": "f01", "expected": null, "split": "test", "expected_status": "pending-first-green"},
    {"id": "case-3", "input": "f04", "expected": null, "split": "val", "expected_status": "pending-first-green"}
  ]
}
```
