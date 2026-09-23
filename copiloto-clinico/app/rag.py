"""Indexação local de SKILL.md e referências com vetores hash esparsos."""
import hashlib
import math
import os
import re
import threading
from pathlib import Path
from langchain_core.embeddings import Embeddings
from langchain_chroma import Chroma
from .registry import KNOWLEDGE, ROOT, REGISTRY

DB = ROOT / 'data' / 'chroma'
LOCK = threading.RLock()
RELATED = {'admissao':'hospital','admissaoped':'hospital','evolucaouti':'uti',
           'passagemplantao':'uti','prescricaoambulatorio':'consultorio',
           'prescricaoambulatorioped':'consultorio','prescricaohospitalar':'hospital',
           'prescricaohospitalarped':'hospital','regulacao':'hospital'}


def embedding_mode():
    mode=os.getenv('RAG_EMBEDDINGS','hash').lower()
    if mode not in ('hash','openai'):
        raise ValueError('RAG_EMBEDDINGS deve ser hash ou openai')
    return mode


def db_path():
    return DB / embedding_mode()

class LocalHashEmbeddings(Embeddings):
    """Hash de palavras e trigramas, sem downloads; indexe novamente ao trocar algoritmo."""
    dimensions = 2048

    def embed_query(self, text: str) -> list[float]:
        vec = [0.] * self.dimensions
        tokens = re.findall(r'[a-zà-ÿ0-9]+', text.lower())
        terms = tokens + [''.join(tokens)[i:i+3] for i in range(max(0, len(''.join(tokens))-2))]
        for token in terms:
            digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
            idx = int.from_bytes(digest,'big') % self.dimensions
            vec[idx] += 1 if len(token) > 3 else 0.3
        norm = math.sqrt(sum(v*v for v in vec)) or 1.
        return [x/norm for x in vec]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(x) for x in texts]


def files():
    for module in REGISTRY:
        folder = KNOWLEDGE / module
        yield module, folder / 'SKILL.md'
        for path in sorted((folder / 'references').rglob('*')) if (folder / 'references').exists() else []:
            if path.is_file() and path.suffix.lower() in {'.md','.txt','.json','.jsonl','.csv'}:
                yield module, path


def chunks(text: str, size: int = 1200, overlap: int = 180):
    text = text.replace('\x00','').strip()
    for pos in range(0, len(text), size-overlap):
        if text[pos:pos+size].strip():
            yield pos, text[pos:pos+size]
        if pos+size >= len(text):
            break


def digest():
    h=hashlib.sha256((embedding_mode()+':'+os.getenv('OPENAI_EMBEDDINGS_MODEL','text-embedding-3-small')+':v2').encode())
    for module,path in files():
        h.update(module.encode()); h.update(str(path.relative_to(ROOT)).encode()); h.update(path.read_bytes())
    return h.hexdigest()


def store():
    path=db_path()
    path.mkdir(parents=True, exist_ok=True)
    if embedding_mode()=='openai':
        from langchain_openai import OpenAIEmbeddings
        embedding=OpenAIEmbeddings(model=os.getenv('OPENAI_EMBEDDINGS_MODEL','text-embedding-3-small'))
    else: embedding=LocalHashEmbeddings()
    return Chroma(collection_name='copiloto_clinico_v2', embedding_function=embedding, persist_directory=str(path))


def ensure_index(force: bool = False):
    with LOCK:
        signature = digest()
        marker = db_path() / 'sources.sha256'
        db=store()
        if force or not marker.exists() or marker.read_text()!=signature or db._collection.count()==0:
            from langchain_core.documents import Document
            db.reset_collection()
            documents,ids=[],[]
            for module,path in files():
                label=str(path.relative_to(ROOT))
                data=path.read_text(encoding='utf-8',errors='replace')
                for pos,content in chunks(data):
                    documents.append(Document(page_content=content,metadata={'module':module,'source':label,'offset':pos}))
                    ids.append(hashlib.sha256(f'{label}:{pos}'.encode()).hexdigest())
            for i in range(0,len(documents),100):
                db.add_documents(documents[i:i+100],ids=ids[i:i+100])
            marker.write_text(signature)
        return db


def retrieve(query: str, module: str, limit: int = 4) -> list[dict]:
    with LOCK:
        db=ensure_index()
        hits=db.similarity_search_with_score(query,k=limit,filter={'module':module})
        if module in RELATED:
            parent=RELATED[module]
            hits.extend(db.similarity_search_with_score(query,k=2,filter={'module':parent}))
    return [{'source':doc.metadata['source'],'offset':doc.metadata['offset'],'text':doc.page_content,'distance':round(float(score),3)} for doc,score in hits]


def status():
    with LOCK:
        db=ensure_index()
        return {'documents':len(list(files())),'chunks':db._collection.count(),'embedding':embedding_mode(),'directory':str(db_path())}
