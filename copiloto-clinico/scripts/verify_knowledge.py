#!/usr/bin/env python3
"""Verifica os arquivos clínicos incluídos contra o manifesto de distribuição."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]


def verify() -> list[str]:
    expected=json.loads((ROOT/'knowledge'/'MANIFEST.json').read_text(encoding='utf-8'))
    errors=[]
    for relative,digest in expected.items():
        path=ROOT/relative
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=digest:
            errors.append(relative)
    return errors

if __name__=='__main__':
    bad=verify()
    print(json.dumps({'files':57,'changed_or_missing':bad},ensure_ascii=False))
    raise SystemExit(bool(bad))
