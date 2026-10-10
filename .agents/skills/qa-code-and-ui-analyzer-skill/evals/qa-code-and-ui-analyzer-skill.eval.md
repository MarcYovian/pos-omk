# Eval Spec: qa-code-and-ui-analyzer-skill

The skill's loss function: structural binary checks for feature intelligence extraction.

## Criteria

1. **valid-json** (command) — the output parses as JSON.
2. **has-feature-fields** (command) — output contains feature_key, feature_name, target_route.
3. **has-prd-and-components** (command) — output contains prd and components arrays.

## Spec

```json
{
  "skill": "qa-code-and-ui-analyzer-skill",
  "run": "python3 scripts/feature_analyzer.py --feature f02 --output {output}",
  "criteria": [
    {
      "id": "valid-json",
      "text": "Output parses as JSON",
      "type": "command",
      "cmd": "python3 -c \"import json,sys; json.load(open(sys.argv[1]))\" {output}"
    },
    {
      "id": "has-feature-fields",
      "text": "Contains core feature fields",
      "type": "command",
      "cmd": "python3 -c \"import json,sys; d=json.load(open(sys.argv[1])); assert 'feature_key' in d and 'target_route' in d\" {output}"
    },
    {
      "id": "has-prd-and-components",
      "text": "Contains prd and components",
      "type": "command",
      "cmd": "python3 -c \"import json,sys; d=json.load(open(sys.argv[1])); assert 'prd' in d and 'components' in d\" {output}"
    }
  ],
  "golden": [
    {"id": "case-1", "input": "f02", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-2", "input": "f01", "expected": null, "split": "test", "expected_status": "pending-first-green"},
    {"id": "case-3", "input": "f04", "expected": null, "split": "val", "expected_status": "pending-first-green"}
  ]
}
```
