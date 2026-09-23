"""FastAPI local. Os dados clínicos e a chave da API não são gravados no servidor."""
import base64
import hmac
import json
import os
import re
import unicodedata
from contextlib import asynccontextmanager
import anthropic
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from .registry import REGISTRY, ROOT, SPECS
from .router import route
from .rag import ensure_index, retrieve, status
from .tools import calculate

KEY_HEADER = 'X-Anthropic-Key'

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_index()
    yield

app=FastAPI(title='Copiloto Clínico Multiagente',version='3.0.0',lifespan=lifespan,docs_url='/api/docs',redoc_url=None)

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
    content: str = Field(min_length=1,max_length=12000)

class ChatInput(BaseModel):
    message: str = Field(min_length=3,max_length=20000)
    module: str = 'auto'
    image: str | None = None
    filename: str | None = None
    history: list['Turn'] = Field(default_factory=list,max_length=12)
    patient_id: str | None = Field(default=None,max_length=64)
    previous_module: str | None = None
    confirmed_patient_id: bool = False
    include_medications: bool = False
    model: str | None = Field(default=None,max_length=64,pattern=r'^claude-[a-z0-9.-]+$')
    effort: str = Field(default='high',pattern='^(low|medium|high|xhigh|max)$')
    web_search: bool = True
    normal_patterns: bool = False

class CalcInput(BaseModel):
    command: str
    values: dict

class KeyCheck(BaseModel):
    model: str | None = Field(default=None,max_length=64,pattern=r'^claude-[a-z0-9.-]+$')


def api_key(request: Request) -> str | None:
    key=request.headers.get(KEY_HEADER,'').strip()
    return key or os.getenv('ANTHROPIC_API_KEY') or None

@app.get('/')
def home():
    return FileResponse(ROOT/'web'/'index.html')

@app.get('/api/modules')
def modules():
    return [vars(x) for x in SPECS]

@app.get('/api/models')
def models():
    from .agents import DEFAULT_MODEL, MODELS
    return {'default':DEFAULT_MODEL,'models':[{'id':k,'label':v['label']} for k,v in MODELS.items()]}

@app.get('/api/health')
def health(request: Request):
    from .agents import DEFAULT_MODEL
    from .fhir import configured
    return {'ready':bool(api_key(request)),'server_key':bool(os.getenv('ANTHROPIC_API_KEY')),'index':status(),
            'specialists':len(REGISTRY),'model':DEFAULT_MODEL,'fhir':configured(),'protected':bool(os.getenv('COPILOT_ACCESS_TOKEN'))}

@app.post('/api/key/check')
def key_check(payload: KeyCheck, request: Request):
    """Valida a chave consultando o modelo escolhido na API de modelos (sem consumo de tokens)."""
    from .agents import DEFAULT_MODEL, client_for
    try:
        info=client_for(api_key(request)).models.retrieve(payload.model or DEFAULT_MODEL)
    except PermissionError as exc:
        raise HTTPException(422,str(exc)) from exc
    except Exception as exc:
        raise api_error(exc) from exc
    return {'ok':True,'model':info.id,'display_name':info.display_name}

@app.post('/api/tools/pediatrics')
def calculator(payload:CalcInput):
    try: return calculate(payload.command,payload.values)
    except ValueError as exc: raise HTTPException(422,str(exc)) from exc


def attachment_data(payload:ChatInput) -> list[dict]:
    if not payload.image: return []
    try: raw=base64.b64decode(payload.image,validate=True)
    except Exception as exc: raise HTTPException(422,'Arquivo inválido') from exc
    if len(raw)>8*1024*1024: raise HTTPException(413,'Arquivo excede 8 MB')
    if raw.startswith(b'%PDF-'): mime='application/pdf'
    elif raw.startswith(b'\x89PNG\r\n\x1a\n'): mime='image/png'
    elif raw.startswith(b'\xff\xd8\xff'): mime='image/jpeg'
    elif raw[:4]==b'RIFF' and raw[8:12]==b'WEBP': mime='image/webp'
    else: raise HTTPException(422,'Aceitos PNG, JPEG, WEBP ou PDF')
    return [{'media_type':mime,'data':base64.b64encode(raw).decode()}]


def api_error(exc: Exception) -> HTTPException:
    """Traduz erros da API sem expor detalhes clínicos ou a chave."""
    if isinstance(exc,anthropic.AuthenticationError):
        return HTTPException(401,'Chave da API Claude inválida ou revogada.')
    if isinstance(exc,anthropic.PermissionDeniedError):
        return HTTPException(403,'A chave não tem permissão para este modelo ou recurso (verifique também se a busca web está habilitada na organização).')
    if isinstance(exc,anthropic.NotFoundError):
        return HTTPException(404,'Modelo não encontrado para esta chave.')
    if isinstance(exc,anthropic.RateLimitError):
        return HTTPException(429,'Limite de uso da API atingido. Aguarde e tente novamente.')
    if isinstance(exc,anthropic.BadRequestError):
        message=str(getattr(exc,'message','') or '')
        if 'credit' in message.lower():
            return HTTPException(402,'Saldo de créditos da API insuficiente.')
        return HTTPException(400,'Requisição recusada pela API: '+message[:300])
    if isinstance(exc,anthropic.APIConnectionError):
        return HTTPException(502,'Sem conexão com a API Claude.')
    return HTTPException(502,'Falha ao executar o modelo. Verifique chave, modelo e conectividade.')

@app.post('/api/chat')
def chat(payload:ChatInput, request: Request):
    try: decision=route(payload.message,payload.module)
    except ValueError as exc: raise HTTPException(422,str(exc)) from exc
    if payload.module=='auto' and decision.reason=='atendimento geral' and payload.history:
        # Complementos curtos continuam no especialista do turno anterior.
        last=payload.previous_module
        if last in REGISTRY: decision=route(payload.message,last)
    attachments=attachment_data(payload)
    snippets=retrieve(payload.message,decision.module)
    key=api_key(request)
    if not key:
        raise HTTPException(503,'Informe a chave da API Claude em Configurações para habilitar os especialistas.')
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
        clinical_context='\n\nPrescrições retornadas pelo FHIR para o ID confirmado '+payload.patient_id+':\n'+json.dumps(meds,ensure_ascii=False)
    from . import agents
    try:
        result=agents.respond(decision.module,payload.message,snippets,attachments,
                              history=[x.model_dump() for x in payload.history],clinical_context=clinical_context,
                              api_key=key,model=payload.model,effort=payload.effort,
                              web_search=payload.web_search,normal_patterns=payload.normal_patterns)
    except PermissionError as exc:
        raise HTTPException(503,str(exc)) from exc
    except Exception as exc:
        raise api_error(exc) from exc
    return {'module':decision.module,'routing_reason':decision.reason,'answer':result['answer'],'fhir_used':bool(clinical_context),
            'model':result['model'],'web_sources':result['web_sources'],'tools':result['tools'],'notice':result['notice'],
            'normal_patterns':payload.normal_patterns,
            'sources':[{'source':x['source'],'offset':x['offset'],'excerpt':x['text'][:350]} for x in snippets]}
