#!/usr/bin/env python3
"""Independent reference for GOVP Workbench stable JSON and artifact-set binding."""
from __future__ import annotations

import hashlib
import json
import pathlib
import sys
from typing import Any


def stable_json(value: Any) -> str:
    if value is None or isinstance(value, bool):
        return json.dumps(value, separators=(",", ":"))
    if isinstance(value, int) and not isinstance(value, bool):
        if abs(value) > 9_007_199_254_740_991:
            raise ValueError("JSON numbers must be safe integers")
        return str(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(stable_json(item) for item in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value, key=lambda item: item.encode("utf-8"))
        return "{" + ",".join(stable_json(key) + ":" + stable_json(value[key]) for key in keys) + "}"
    raise TypeError("unsupported JSON value")


def artifact_set_digest(artifacts: list[dict[str, Any]]) -> str:
    entries = [{"path": item["path"], "artifactType": item["artifactType"], "sha256": item["sha256"].lower()} for item in artifacts]
    entries.sort(key=lambda item: item["path"].encode("utf-8"))
    return hashlib.sha256(stable_json(entries).encode("utf-8")).hexdigest()


def main() -> int:
    vector_path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parents[1] / "conformance" / "artifact-set-vectors.json"
    data = json.loads(vector_path.read_text(encoding="utf-8"))
    for vector in data["vectors"]:
        actual = artifact_set_digest(vector["artifacts"])
        if actual != vector["artifactSetSha256"]:
            print(f"FAIL {vector['id']}: {actual}", file=sys.stderr)
            return 1
        print(f"PASS {vector['id']}: {actual}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
