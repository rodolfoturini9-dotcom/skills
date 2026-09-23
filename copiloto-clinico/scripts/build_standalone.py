#!/usr/bin/env python3
"""Gera dist/copiloto_clinico.html: interface + base de conhecimento em um único arquivo, sem servidor."""
import json
import re
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from app import agents  # noqa: E402
from app.rag import RELATED, chunks, files, module_context, read  # noqa: E402
from app.registry import SPECS  # noqa: E402

PLACEHOLDER='<script id="kb" type="application/json">null</script>'


def knowledge() -> dict:
    tools=agents.tool_definitions('admissao',None)  # inclui consultar_referencias
    for tool in tools:
        if tool['name']=='consultar_referencias':
            tool['description']=re.sub(r'"hospital"','"{parent}"',tool['description'])
    return {
        'modules':[vars(x) for x in SPECS],
        'models':agents.MODELS,'default_model':agents.DEFAULT_MODEL,
        'safety':agents.SAFETY,'normal_on':agents.NORMAL_ON,'normal_off':agents.NORMAL_OFF,
        'related':RELATED,'tools':tools,
        'context':{x.key:module_context(x.key) for x in SPECS},
        'chunks':[{'module':m,'source':str(p.relative_to(ROOT)),'offset':pos,'text':text}
                  for m,p in files() for pos,text in chunks(read(p))],
    }


def build(target: Path = ROOT/'dist'/'copiloto_clinico.html') -> Path:
    html=(ROOT/'web'/'index.html').read_text(encoding='utf-8')
    if html.count(PLACEHOLDER)!=1:
        raise SystemExit('Marcador da base de conhecimento não encontrado em web/index.html')
    data=json.dumps(knowledge(),ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(html.replace(PLACEHOLDER,f'<script id="kb" type="application/json">{data}</script>'),encoding='utf-8')
    return target


if __name__=='__main__':
    out=build()
    print(json.dumps({'arquivo':str(out.relative_to(ROOT)),'bytes':out.stat().st_size},ensure_ascii=False))
