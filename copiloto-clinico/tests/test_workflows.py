import base64
from types import SimpleNamespace as NS
from fastapi.testclient import TestClient
from app.main import app
from app.router import route
from app.registry import REGISTRY
from app.rag import module_context, retrieve, status
from app.tools import calculate

PDF = b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'


def fake(**overrides):
    """Substituto de agents.respond que registra os argumentos recebidos."""
    seen={}
    def respond(module,question,snippets,attachments=None,history=None,clinical_context='',**kwargs):
        seen.update(module=module,question=question,attachments=attachments,history=history,context=clinical_context,**kwargs)
        return {'answer':'Rascunho para revisão médica.','model':'claude-opus-5','web_sources':[],'tools':[],'notice':'',**overrides}
    return seen,respond


def test_router_clinical_intents():
    assert route('Preciso de admissão pediátrica para lactente').module == 'admissaoped'
    assert route('Interprete este ECG com imagem').module == 'ecg'
    assert route('Faça prescrição hospitalar pediátrica').module == 'prescricaohospitalarped'
    assert route('Faça evolução na UTI').module == 'evolucaouti'
    assert route('Solicite transferência via regulação').module == 'regulacao'
    assert route('quero consultar dados','passagemplantao').module == 'passagemplantao'
    assert len(REGISTRY)==14


def test_router_age_only_pediatric_under_18():
    assert route('Prescrição para paciente de 65 anos com pneumonia').module == 'prescricaoambulatorio'
    assert route('Admissão de paciente 72 anos com ICC').module == 'admissao'
    assert route('Prescrição para criança de 4 anos com otite').module == 'prescricaoambulatorioped'
    assert route('Prescrição hospitalar, 12 anos, 30 kg').module == 'prescricaohospitalarped'


def test_knowledge_context_and_traceability():
    assert status()['chunks']>40
    context=module_context('uti')
    assert 'knowledge/uti/SKILL.md' in context and 'base_medicamentos.jsonl' in context
    assert 'knowledge/ecg/' not in context
    hits=retrieve('ECG ritmo QRS frequência cardíaca','ecg',3)
    assert hits and all(h['source'].startswith('knowledge/ecg/') and h['text'] for h in hits)


def test_original_pediatric_script_integration():
    assert calculate('dose-volume',{'weight_kg':20,'dose_mg_kg':10,'concentration_mg_ml':40})=={'dose_mg':'200','volume_ml':'5'}
    assert calculate('dose-volume',{'weight_kg':20,'dose_mg_kg':10,'concentration_mg_ml':40,'max_dose_mg':100})['dose_mg']=='100'
    assert calculate('maintenance',{'weight_kg':15})['holliday_segar_ml_day']=='1250'
    assert calculate('drip',{'volume_ml':120,'hours':2,'drop_factor':20})['rounded_gtt_min']=='20'


def test_api_without_key(monkeypatch):
    monkeypatch.delenv('ANTHROPIC_API_KEY',raising=False)
    with TestClient(app) as client:
        assert client.get('/').status_code==200
        assert len(client.get('/api/modules').json())==14
        assert client.get('/api/models').json()['default']=='claude-opus-5'
        assert client.get('/api/health').json()['ready'] is False
        assert client.get('/api/health',headers={'X-Anthropic-Key':'sk-ant-teste'}).json()['ready'] is True
        assert client.post('/api/tools/pediatrics',json={'command':'maintenance','values':{'weight_kg':10}}).json()['four_two_one_ml_h']=='40'
        assert client.post('/api/chat',json={'message':'Avalie este ECG'}).status_code==503
        assert client.post('/api/chat',json={'message':'Caso clínico','module':'inexistente'}).status_code==422


def test_access_token_protects_api_and_allows_home(monkeypatch):
    monkeypatch.setenv('COPILOT_ACCESS_TOKEN','test-secret')
    with TestClient(app) as client:
        assert client.get('/').status_code==200
        assert client.get('/api/health').status_code==401
        assert client.get('/api/modules',headers={'X-Copilot-Token':'test-secret'}).status_code==200
        assert client.post('/api/tools/pediatrics',json={'command':'maintenance','values':{'weight_kg':10}}).status_code==401


def test_header_key_and_options_reach_specialist(monkeypatch):
    from app import agents
    seen,respond=fake()
    monkeypatch.setattr(agents,'respond',respond)
    monkeypatch.setenv('ANTHROPIC_API_KEY','sk-ant-servidor')
    with TestClient(app) as client:
        body={'message':'Faça admissão de adulto','model':'claude-sonnet-5','effort':'medium','web_search':False,'normal_patterns':True}
        response=client.post('/api/chat',json=body,headers={'X-Anthropic-Key':'sk-ant-usuario'})
        assert response.status_code==200,response.text
        assert seen['api_key']=='sk-ant-usuario' and seen['model']=='claude-sonnet-5'
        assert seen['effort']=='medium' and seen['web_search'] is False and seen['normal_patterns'] is True
        client.post('/api/chat',json={'message':'Faça admissão de adulto'})
        assert seen['api_key']=='sk-ant-servidor' and seen['normal_patterns'] is False
        assert client.post('/api/chat',json={**body,'effort':'extremo'}).status_code==422


def test_follow_up_keeps_specialist_and_history(monkeypatch):
    from app import agents
    seen,respond=fake()
    monkeypatch.setattr(agents,'respond',respond)
    monkeypatch.setenv('ANTHROPIC_API_KEY','dummy')
    with TestClient(app) as client:
        response=client.post('/api/chat',json={
            'message':'Acrescente apenas o exame físico informado.',
            'previous_module':'admissaoped',
            'history':[{'role':'user','content':'Faça uma admissão pediátrica.'},
                       {'role':'assistant','content':'Rascunho inicial.'}]})
        assert response.status_code==200,response.text
        assert seen['module']=='admissaoped'
        assert len(seen['history'])==2
        assert response.json()['module']=='admissaoped'


def test_fhir_requires_confirmed_patient_id_and_filters_other_patient(monkeypatch):
    from app import agents,fhir
    monkeypatch.setenv('ANTHROPIC_API_KEY','dummy')
    monkeypatch.setenv('FHIR_BASE_URL','https://fhir.example.test/r4')
    monkeypatch.setenv('FHIR_BEARER_TOKEN','dummy-bearer')
    seen,respond=fake()
    monkeypatch.setattr(agents,'respond',respond)
    resource=lambda subject,ident: {'resourceType':'MedicationRequest','id':ident,'subject':{'reference':subject},'medicationCodeableConcept':{'text':'Exemplo'},'status':'active'}
    bundle={'resourceType':'Bundle','entry':[{'resource':resource('Patient/42','m1')},{'resource':resource('Patient/99','m2')}]}
    class FakeClient:
        def __init__(self,**kwargs): pass
        def __enter__(self): return self
        def __exit__(self,*args): return False
        def get(self,url,params,headers):
            assert params['patient']=='42'
            class Response:
                def raise_for_status(self): pass
                def json(self): return bundle
            return Response()
    monkeypatch.setattr(fhir.httpx,'Client',FakeClient)
    with TestClient(app) as client:
        base={'message':'Mostre prescrições do prontuário','include_medications':True,'patient_id':'42'}
        assert client.post('/api/chat',json=base).status_code==422
        result=client.post('/api/chat',json={**base,'confirmed_patient_id':True})
        assert result.status_code==200,result.text
        assert result.json()['fhir_used'] is True
        assert 'm1' in seen['context'] and 'm2' not in seen['context']
        assert client.post('/api/chat',json={'message':'Liste as prescrições ativas do prontuário'}).status_code==422
        result_auto=client.post('/api/chat',json={'message':'Liste as prescrições ativas do prontuário','patient_id':'42','confirmed_patient_id':True})
        assert result_auto.status_code==200 and result_auto.json()['fhir_used'] is True


def test_pdf_is_sent_natively_and_invalid_files_rejected(monkeypatch):
    from app import agents
    seen,respond=fake()
    monkeypatch.setattr(agents,'respond',respond)
    monkeypatch.setenv('ANTHROPIC_API_KEY','dummy')
    with TestClient(app) as client:
        response=client.post('/api/chat',json={'message':'Analise este ECG','image':base64.b64encode(PDF).decode()})
        assert response.status_code==200,response.text
        assert seen['attachments'][0]['media_type']=='application/pdf'
        assert client.post('/api/chat',json={'message':'Analise este ECG','image':base64.b64encode(b'GIF89a').decode()}).status_code==422


def test_api_errors_are_translated(monkeypatch):
    import anthropic, httpx
    from app import agents
    request=httpx.Request('POST','https://api.anthropic.com/v1/messages')
    def boom(*args,**kwargs):
        raise anthropic.AuthenticationError('invalid x-api-key',response=httpx.Response(401,request=request),body=None)
    monkeypatch.setattr(agents,'respond',boom)
    with TestClient(app) as client:
        response=client.post('/api/chat',json={'message':'Faça admissão'},headers={'X-Anthropic-Key':'sk-ant-errada'})
        assert response.status_code==401 and 'inválida' in response.json()['detail']
        assert 'sk-ant-errada' not in response.text


class FakeMessages:
    """Simula a API: 1ª resposta pede a ferramenta de cálculo, 2ª encerra com texto."""
    def __init__(self):
        self.calls=[]
    def create(self,**params):
        self.calls.append({**params,'messages':list(params['messages'])})
        if len(self.calls)==1:
            return NS(model=params['model'],stop_reason='tool_use',content=[
                NS(type='thinking',thinking=''),
                NS(type='tool_use',id='tu_1',name='calcular_dose_volume',input={'peso_kg':20,'dose_mg_kg':10,'concentracao_mg_ml':40})])
        return NS(model=params['model'],stop_reason='end_turn',content=[
            NS(type='web_search_tool_result',content=[NS(title='Diretriz',url='https://example.org/d')]),
            NS(type='text',text='```text\nDipirona 500 mg/mL - 5 mL\n```')])


def test_agent_loop_runs_tools_with_cached_skill_prompt(monkeypatch):
    from app import agents
    fake_messages=FakeMessages()
    monkeypatch.setattr(agents,'client_for',lambda key: NS(beta=NS(messages=fake_messages)))
    result=agents.respond('prescricaohospitalarped','Prescrição para 20 kg',[],None,api_key='sk-ant-x')
    first,second=fake_messages.calls
    assert first['model']=='claude-opus-5' and first['thinking']=={'type':'adaptive'}
    assert first['output_config']=={'effort':'high'} and first['fallbacks']=='default'
    assert first['betas']==['server-side-fallback-2026-07-01']
    assert first['system'][1]['cache_control']=={'type':'ephemeral','ttl':'1h'}
    assert 'knowledge/prescricaohospitalarped/SKILL.md' in first['system'][1]['text']
    names=[t['name'] for t in first['tools']]
    assert 'web_search' in names and 'consultar_referencias' in names
    assert 'DESATIVADOS' in first['messages'][-1]['content'][-1]['text']
    tool_result=second['messages'][-1]['content'][0]
    assert tool_result['tool_use_id']=='tu_1' and '"volume_ml": "5"' in tool_result['content']
    assert result['tools']==['calcular_dose_volume'] and result['web_sources'][0]['url']=='https://example.org/d'
    assert 'Dipirona' in result['answer']


def test_haiku_profile_omits_unsupported_parameters(monkeypatch):
    from app import agents
    fake_messages=FakeMessages()
    monkeypatch.setattr(agents,'client_for',lambda key: NS(beta=NS(messages=fake_messages)))
    agents.respond('consultorio','Dúvida',[],None,api_key='k',model='claude-haiku-4-5',web_search=False,normal_patterns=True)
    first=fake_messages.calls[0]
    assert 'thinking' not in first and 'fallbacks' not in first and 'output_config' not in first
    assert 'web_search' not in [t['name'] for t in first['tools']]
    assert 'PERMITIDOS' in first['messages'][-1]['content'][-1]['text']


def test_standalone_build_embeds_knowledge(tmp_path):
    import json, re
    from scripts.build_standalone import build
    html=build(tmp_path/'copiloto.html').read_text(encoding='utf-8')
    data=json.loads(re.search(r'<script id="kb" type="application/json">(.*?)</script>',html,re.S).group(1).replace('<\\/','</'))
    assert len(data['modules'])==14 and set(data['context'])==set(REGISTRY)
    assert data['default_model']=='claude-opus-5' and data['chunks']
