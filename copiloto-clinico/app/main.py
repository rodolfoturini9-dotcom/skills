"""FastAPI local. Os dados clínicos não são gravados em servidor ou navegador."""
import base64
import hmac
import json
import os
import re
import unicodedata
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from .registry import REGISTRY, ROOT, SPECS
from .router import route
from .rag import ensure_index, retrieve, status
from .tools import calculate

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_index()
    yield

app=FastAPI(title='Copiloto Clínico Multiagente',version='2.0.0',lifespan=lifespan,docs_url='/api/docs',redoc_url=None)

@app.middleware('http')
async def no_store(request:Request,call_next):
    secret=os.getenv('COPILOT_ACCESS_TOKEN','')
    if secret and request.url.path != '/':
        candidate=request.headers.get('X-Copilot-Token','')
        if not hmac.compare_digest(candidate,secret):
            return JSONResponse({'detail':'Acesso não autorizado.'},status_code=401,headers={'Cache-Control':'no-store'})
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    return response

class Turn(BaseModel):
    role: str = Field(pattern='^(user|assistant)$')
    content: str = Field(min_length=1,max_length=3000)

class ChatInput(BaseModel):
    message: str = Field(min_length=3,max_length=20000)
    module: str = 'auto'
    image: str | None = None
    filename: str | None = None
    history: list['Turn'] = Field(default_factory=list,max_length=8)
    patient_id: str | None = Field(default=None,max_length=64)
    previous_module: str | None = None
    confirmed_patient_id: bool = False
    include_medications: bool = False

class CalcInput(BaseModel):
    command: str
    values: dict

@app.get('/')
def home():
    return FileResponse(ROOT/'web'/'index.html')

@app.get('/api/modules')
def modules():
    return [vars(x) for x in SPECS]

@app.get('/api/health')
def health():
    from .fhir import configured
    return {'ready':bool(os.getenv('OPENAI_API_KEY')),'index':status(),'specialists':len(REGISTRY),'model':os.getenv('OPENAI_MODEL','gpt-4.1'),'fhir':configured(),'protected':bool(os.getenv('COPILOT_ACCESS_TOKEN'))}

@app.post('/api/tools/pediatrics')
def calculator(payload:CalcInput):
    try: return calculate(payload.command,payload.values)
    except ValueError as exc: raise HTTPException(422,str(exc)) from exc


def image_data(payload:ChatInput):
    if not payload.image: return None
    try: raw=base64.b64decode(payload.image,validate=True)
    except Exception as exc: raise HTTPException(422,'Imagem inválida') from exc
    if len(raw)>8*1024*1024: raise HTTPException(413,'Arquivo excede 8 MB')
    if raw.startswith(b'%PDF-'):
        try:
            import fitz
            pdf=fitz.open(stream=raw,filetype='pdf')
            if pdf.page_count < 1 or pdf.page_count>5: raise HTTPException(422,'PDF deve conter entre 1 e 5 páginas')
            pages=[]
            for page in pdf:
                image=page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False)
                if image.width*image.height>6_000_000:
                    raise HTTPException(413,'Página de PDF com dimensões excessivas')
                data=image.tobytes('png')
                pages.append('data:image/png;base64,'+base64.b64encode(data).decode())
            return pages
        except HTTPException: raise
        except Exception as exc: raise HTTPException(422,'PDF inválido') from exc
    if raw.startswith(b'\x89PNG\r\n\x1a\n'): mime='image/png'
    elif raw.startswith(b'\xff\xd8\xff'): mime='image/jpeg'
    else: raise HTTPException(422,'Aceitos PNG, JPEG ou PDF')
    return [f'data:{mime};base64,{base64.b64encode(raw).decode()}']

@app.post('/api/chat')
def chat(payload:ChatInput):
    try: decision=route(payload.message,payload.module)
    except ValueError as exc: raise HTTPException(422,str(exc)) from exc
    if payload.module=='auto' and decision.reason=='atendimento geral' and payload.history:
        # Complementos curtos continuam no especialista do turno anterior.
        last=payload.previous_module
        if last in REGISTRY: decision=route(payload.message,last)
    picture=image_data(payload)
    snippets=retrieve(payload.message,decision.module)
    if not os.getenv('OPENAI_API_KEY'):
        raise HTTPException(503,'Configure OPENAI_API_KEY no ambiente para habilitar os agentes de linguagem.')
    clinical_context=''
    plain=''.join(c for c in unicodedata.normalize('NFKD',payload.message.lower()) if not unicodedata.combining(c))
    request_history=bool(re.search(r'(historico de (?:prescric|receit|medic)|(?:prescric|receit|medic)[a-z ]* (?:ativas|em uso|registrad)|(?:medicamentos?|prescricoes?) do prontuario)',plain))
    if payload.include_medications or request_history:
        if not payload.patient_id or not payload.confirmed_patient_id:
            raise HTTPException(422,'Confirme o ID técnico do paciente antes da consulta FHIR.')
        from .fhir import FHIRConfigurationError,FHIRLookupError,medication_requests
        try:
            meds=medication_requests(payload.patient_id)
        except (ValueError,FHIRConfigurationError) as exc:
            raise HTTPException(422,str(exc)) from exc
        except FHIRLookupError as exc:
            raise HTTPException(502,str(exc)) from exc
        clinical_context='\nPrescrições retornadas pelo FHIR para o ID confirmado '+payload.patient_id+':\n'+json.dumps(meds,ensure_ascii=False)
    try:
        from .agents import respond
        answer=respond(decision.module,payload.message,snippets,picture,
                       history=[x.model_dump() for x in payload.history],clinical_context=clinical_context)
    except Exception as exc:
        # Não devolver detalhes de API ou informações clínicas em erros.
        raise HTTPException(502,'Falha ao executar o modelo. Verifique chave, modelo e conectividade.') from exc
    return {'module':decision.module,'routing_reason':decision.reason,'answer':answer,'fhir_used':bool(clinical_context),
            'sources':[{'source':x['source'],'offset':x['offset'],'excerpt':x['text'][:350]} for x in snippets]}
