#!/usr/bin/env python3
"""
feature_analyzer.py — Codebase & Documentation Feature Analyzer
Extracts feature metadata, PRD User Stories & Acceptance Criteria, User Flows,
Vue components, Pinia stores, and Supabase RPC signatures into feature-analysis.json.
"""

import os
import re
import sys
import json
import argparse
from typing import Dict, List, Any, Optional

FEATURE_MAP = {
    "f01": {"code": "F-01", "name": "Authentication & RBAC", "route": "/login", "files": ["app/pages/login.vue", "app/pages/change-password.vue", "app/pages/reset-password.vue"], "stores": ["app/stores/auth.ts"]},
    "f02": {"code": "F-02", "name": "Real-time POS Cashier Screen", "route": "/pos", "files": ["app/pages/pos.vue"], "stores": ["app/stores/cart.ts", "app/stores/products.ts"]},
    "f03": {"code": "F-03", "name": "PWA & Offline Transaction Queue", "route": "/pos", "files": ["app/components/ui/OfflineBanner.vue", "app/composables/useOfflineQueue.ts"], "stores": ["app/stores/cart.ts"]},
    "f04": {"code": "F-04", "name": "UMKM Partner Master Data Management", "route": "/admin/umkm", "files": ["app/pages/admin/umkm/index.vue", "app/pages/admin/umkm/[umkm_id].vue"], "stores": ["app/stores/umkm.ts"]},
    "f05": {"code": "F-05", "name": "Weekly Session Setup & Active Catalog", "route": "/admin/setup", "files": ["app/pages/admin/setup/index.vue", "app/pages/admin/setup/[umkm_id].vue"], "stores": ["app/stores/session.ts"]},
    "f06": {"code": "F-06", "name": "Financial Session Dashboard", "route": "/admin/dashboard", "files": ["app/pages/admin/dashboard.vue"], "stores": ["app/stores/session.ts"]},
    "f07": {"code": "F-07", "name": "End-of-Day Stock Reconciliation", "route": "/admin/reconciliation", "files": ["app/pages/admin/reconciliation.vue"], "stores": ["app/stores/session.ts"]},
    "f08": {"code": "F-08", "name": "WhatsApp Report Generator", "route": "/admin/reports", "files": ["app/pages/admin/reports.vue", "app/utils/report.ts"], "stores": ["app/stores/session.ts"]},
    "f09": {"code": "F-09", "name": "Session History & Cashier Transaction Logs", "route": "/admin/history", "files": ["app/pages/admin/history.vue"], "stores": ["app/stores/history.ts"]},
    "f10": {"code": "F-10", "name": "Sales Analytics & Data Visualization", "route": "/admin/analytics", "files": ["app/pages/admin/analytics.vue"], "stores": []},
    "f11": {"code": "F-11", "name": "Cash Flow Ledger", "route": "/admin/cash-flow", "files": ["app/pages/admin/cash-flow.vue"], "stores": ["app/stores/cashFlow.ts"]},
    "f12": {"code": "F-12", "name": "UMKM Settlements & Payments", "route": "/admin/payments", "files": ["app/pages/admin/payments.vue"], "stores": ["app/stores/payment.ts"]},
    "f13": {"code": "F-13", "name": "Public UMKM Sales Performance Portal", "route": "/umkm/performance/[umkm_id]", "files": ["app/pages/umkm/performance/[umkm_id].vue", "server/api/public/umkm-performance/[id].get.ts"], "stores": []},
    "f14": {"code": "F-14", "name": "User & Cashier Account Management", "route": "/admin/users", "files": ["app/pages/admin/users.vue"], "stores": ["app/stores/auth.ts"]},
    "f15": {"code": "F-15", "name": "Multi-Parish / Multi-Company Tenancy Architecture", "route": "/admin/settings/company", "files": ["app/pages/admin/settings/company.vue", "app/components/ui/CompanySwitcher.vue"], "stores": ["app/stores/company.ts"]},
    "f16": {"code": "F-16", "name": "Dynamic Roles & Permissions Catalog Management", "route": "/admin/roles", "files": ["app/pages/admin/roles.vue", "app/pages/admin/permissions.vue"], "stores": ["app/stores/auth.ts"]}
}


def normalize_feature_key(feat_input: str) -> str:
    cleaned = feat_input.lower().strip()
    match = re.search(r"f0?([1-9]|1[0-6])", cleaned)
    if match:
        num = int(match.group(1))
        return f"f{num:02d}"
    for k, v in FEATURE_MAP.items():
        if cleaned in v["name"].lower() or cleaned in v["route"].lower():
            return k
    return "f02"


def extract_prd_info(project_root: str, feature_code: str) -> Dict[str, Any]:
    prd_path = os.path.join(project_root, "docs", "PRD.md")
    result = {"user_stories": [], "acceptance_criteria": [], "roles": [], "raw_excerpt": ""}
    if not os.path.exists(prd_path):
        return result

    try:
        with open(prd_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Search for feature heading e.g. "### F-02:"
        pattern = rf"(###\s+{re.escape(feature_code)}[:\s].*?)(?=\n###|\n##|\Z)"
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            section = match.group(1)
            result["raw_excerpt"] = section[:3000]

            # Extract User Stories (e.g. *Sebagai kasir, ...*)
            stories = re.findall(r"\*\s*(Sebagai\s+[^,\n]+,\s+saya\s+ingin\s+[^,\n]+,\s+agar\s+[^\*\n\.]+)\*", section, re.IGNORECASE)
            if not stories:
                stories = re.findall(r"\*\s*(Sebagai\s+[^\*\n]+)\*", section, re.IGNORECASE)
            result["user_stories"] = [s.strip() for s in stories]

            # Extract Acceptance Criteria Scenarios
            scenarios = re.findall(r"-\s+\*\*(Skenario\s+[\d\.]+:?[^\*]+)\*\*\s*\n((?:\s+-\s+\*\*(?:Given|When|Then):\*\*?[^\n]+\n*)+)", section, re.DOTALL)
            for title, gwt_body in scenarios:
                steps = []
                for step in re.findall(r"-\s+\*\*(Given|When|Then):\*\*?\s*([^\n]+)", gwt_body):
                    steps.append(f"{step[0]}: {step[1].strip()}")
                result["acceptance_criteria"].append({
                    "title": title.strip(),
                    "steps": steps
                })

            # Extract roles
            for r in ["Kasir", "Cashier", "Admin", "Super Admin", "Pengurus", "UMKM", "Vendor", "Guest"]:
                if re.search(rf"\b{r}\b", section, re.IGNORECASE):
                    result["roles"].append(r)
    except Exception as e:
        result["error"] = str(e)
    return result


def extract_user_flow(project_root: str, feature_code: str) -> Dict[str, Any]:
    flow_path = os.path.join(project_root, "docs", "USER_FLOWS.md")
    result = {"steps": [], "screens": [], "diagram": ""}
    if not os.path.exists(flow_path):
        return result

    try:
        with open(flow_path, "r", encoding="utf-8") as f:
            content = f.read()

        pattern = rf"({re.escape(feature_code)}[:\s].*?)(?=\n##|\Z)"
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            section = match.group(1)
            steps = re.findall(r"(\d+\.\s+[^\n]+)", section)
            result["steps"] = steps[:10]
            mermaid = re.search(r"```mermaid\s+(flowchart.*?)```", section, re.DOTALL)
            if mermaid:
                result["diagram"] = mermaid.group(1).strip()
    except Exception:
        pass
    return result


def extract_vue_elements(project_root: str, file_rel_path: str, feature_prefix: str) -> Dict[str, Any]:
    full_path = os.path.join(project_root, file_rel_path)
    result = {
        "file": file_rel_path,
        "inputs": [],
        "buttons": [],
        "modals": [],
        "existing_test_ids": [],
        "suggested_locators": []
    }
    if not os.path.exists(full_path):
        return result

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Find existing data-testid
        test_ids = re.findall(r'data-testid=["\']([^"\']+)["\']', code)
        result["existing_test_ids"] = list(set(test_ids))

        # Find inputs
        inputs = re.findall(r'(<(?:input|textarea|select|AppInput)[^>]*>)', code, re.IGNORECASE)
        for inp in inputs:
            type_m = re.search(r'type=["\']([^"\']+)["\']', inp)
            name_m = re.search(r'name=["\']([^"\']+)["\']', inp) or re.search(r'v-model=["\']([^"\']+)["\']', inp)
            ph_m = re.search(r'placeholder=["\']([^"\']+)["\']', inp)
            inp_type = type_m.group(1) if type_m else "text"
            inp_name = name_m.group(1) if name_m else "field"
            inp_ph = ph_m.group(1) if ph_m else ""

            suggested_id = f"{feature_prefix}-{inp_name.replace('.', '-').replace(' ', '-')}-input"
            result["inputs"].append({
                "tag": inp.strip()[:100],
                "type": inp_type,
                "name": inp_name,
                "placeholder": inp_ph,
                "suggested_testid": suggested_id
            })

        # Find buttons
        buttons = re.findall(r'(<(?:button|AppButton)[^>]*>(?:.*?</(?:button|AppButton)>)?)', code, re.IGNORECASE | re.DOTALL)
        for btn in buttons[:25]:
            text_m = re.search(r'>([^<]+)<', btn)
            btn_text = text_m.group(1).strip() if text_m else "Action"
            slug = re.sub(r'[^a-zA-Z0-9]+', '-', btn_text.lower()).strip('-') or "action"
            suggested_id = f"{feature_prefix}-{slug}-btn"
            result["buttons"].append({
                "snippet": btn.strip()[:120].replace('\n', ' '),
                "text": btn_text,
                "suggested_testid": suggested_id
            })

        # Find modals
        modals = re.findall(r'(<(?:AppModal|dialog)[^>]*>)', code, re.IGNORECASE)
        result["modals"] = [m.strip()[:100] for m in modals]

    except Exception as e:
        result["error"] = str(e)
    return result


def extract_store_info(project_root: str, store_rel_path: str) -> Dict[str, Any]:
    full_path = os.path.join(project_root, store_rel_path)
    result = {"store_file": store_rel_path, "state": [], "actions": [], "rpcs": []}
    if not os.path.exists(full_path):
        return result

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            code = f.read()

        # State refs
        refs = re.findall(r'const\s+([a-zA-Z0-9_]+)\s*=\s*ref\(', code)
        result["state"] = refs

        # Actions
        actions = re.findall(r'(?:const|function)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>', code)
        result["actions"] = actions

        # Supabase RPC calls
        rpcs = re.findall(r'\.rpc\(["\']([^"\']+)["\']', code)
        result["rpcs"] = list(set(rpcs))
    except Exception as e:
        result["error"] = str(e)
    return result


def analyze_feature(feature_key: str, project_root: str = ".") -> Dict[str, Any]:
    norm_key = normalize_feature_key(feature_key)
    meta = FEATURE_MAP.get(norm_key, FEATURE_MAP["f02"])
    feature_code = meta["code"]

    prd_info = extract_prd_info(project_root, feature_code)
    flow_info = extract_user_flow(project_root, feature_code)

    components_data = []
    prefix = norm_key
    for f in meta.get("files", []):
        if f.endswith(".vue"):
            comp_info = extract_vue_elements(project_root, f, prefix)
            components_data.append(comp_info)

    stores_data = []
    for s in meta.get("stores", []):
        st_info = extract_store_info(project_root, s)
        stores_data.append(st_info)

    output = {
        "feature_key": norm_key,
        "feature_code": feature_code,
        "feature_name": meta["name"],
        "target_route": meta["route"],
        "files": meta["files"],
        "prd": prd_info,
        "user_flows": flow_info,
        "components": components_data,
        "stores": stores_data,
        "recommended_testids": []
    }

    # Aggregate recommendations
    for c in components_data:
        for inp in c.get("inputs", []):
            output["recommended_testids"].append({
                "element": inp.get("name"),
                "type": "input",
                "recommended": inp.get("suggested_testid"),
                "file": c.get("file")
            })
        for btn in c.get("buttons", []):
            output["recommended_testids"].append({
                "element": btn.get("text"),
                "type": "button",
                "recommended": btn.get("suggested_testid"),
                "file": c.get("file")
            })

    return output


def main():
    parser = argparse.ArgumentParser(description="Extract feature intelligence across docs and codebase")
    parser.add_argument("--feature", required=True, help="Feature code or slug (e.g. f02, F-02, pos)")
    parser.add_argument("--output", help="Optional output JSON path")
    parser.add_argument("--project-root", default=".", help="Root directory of the project")
    args = parser.parse_args()

    data = analyze_feature(args.feature, args.project_root)
    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Analysis saved to {args.output}")
    else:
        print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
