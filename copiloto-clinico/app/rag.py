"""Base de conhecimento local: textos integrais por módulo e recuperação lexical em memória."""
import hashlib
import math
import re
import threading
from functools import lru_cache
from .registry import KNOWLEDGE, ROOT, REGISTRY

LOCK = threading.RLock()
SUFFIXES = {'.md','.txt','.json','.jsonl','.csv'}
# Módulo "pai" consultável pela ferramenta consultar_referencias.
RELATED = {'admissao':'hospital','admissaoped':'hospital','evolucaouti':'uti',
           'passagemplantao':'uti','prescricaoambulatorio':'consultorio',
           'prescricaoambulatorioped':'consultorio','prescricaohospitalar':'hospital',
           'prescricaohospitalarped':'hospital','regulacao':'hospital'}
DIMENSIONS = 2048


def files():
    for module in REGISTRY:
        folder = KNOWLEDGE / module
        yield module, folder / 'SKILL.md'
        for path in sorted((folder / 'references').rglob('*')) if (folder / 'references').exists() else []:
            if path.is_file() and path.suffix.lower() in SUFFIXES:
                yield module, path


def read(path) -> str:
    return path.read_text(encoding='utf-8',errors='replace').replace('\x00','')


@lru_cache(maxsize=None)
def module_context(module: str) -> str:
    """SKILL.md e todas as referências do módulo, integrais, para o prompt de sistema (cacheável)."""
    if module not in REGISTRY:
        raise ValueError('Especialista desconhecido')
    parts=[]
    for owner,path in files():
        if owner!=module: continue
        label=str(path.relative_to(ROOT))
        parts.append(f'<arquivo caminho="{label}">\n{read(path).strip()}\n</arquivo>')
    return '\n\n'.join(parts)


def embed(text: str) -> list[float]:
    """Hash de palavras e trigramas; recuperação lexical aproximada, sem chamadas externas."""
    vec = [0.] * DIMENSIONS
    tokens = re.findall(r'[a-zà-ÿ0-9]+', text.lower())
    joined = ''.join(tokens)
    terms = tokens + [joined[i:i+3] for i in range(max(0, len(joined)-2))]
    for token in terms:
        digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
        vec[int.from_bytes(digest,'big') % DIMENSIONS] += 1 if len(token) > 3 else 0.3
    norm = math.sqrt(sum(v*v for v in vec)) or 1.
    return [x/norm for x in vec]


def chunks(text: str, size: int = 1200, overlap: int = 180):
    text = text.strip()
    for pos in range(0, len(text), size-overlap):
        if text[pos:pos+size].strip():
            yield pos, text[pos:pos+size]
        if pos+size >= len(text):
            break


@lru_cache(maxsize=1)
def index() -> tuple:
    with LOCK:
        rows=[]
        for module,path in files():
            label=str(path.relative_to(ROOT))
            for pos,content in chunks(read(path)):
                rows.append((module,label,pos,content,embed(content)))
        return tuple(rows)


def ensure_index():
    return index()


def retrieve(query: str, module: str, limit: int = 4) -> list[dict]:
    q=embed(query)
    def top(target, k):
        scored=[(sum(a*b for a,b in zip(q,row[4])),row) for row in index() if row[0]==target]
        scored.sort(key=lambda x:x[0],reverse=True)
        return scored[:k]
    hits=top(module,limit)
    if module in RELATED:
        hits+=top(RELATED[module],2)
    return [{'source':row[1],'offset':row[2],'text':row[3],'distance':round(1-score,3)} for score,row in hits]


def status():
    return {'documents':len(list(files())),'chunks':len(index()),'embedding':'hash-local'}
