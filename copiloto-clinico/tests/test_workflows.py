from fastapi.testclient import TestClient
from app.main import app
from app.router import route
from app.registry import REGISTRY
from app.rag import retrieve, status
from app.tools import calculate


def test_router_clinical_intents():
    assert route('Preciso de admissão pediátrica para lactente').module == 'admissaoped'
    assert route('Interprete este ECG com imagem').module == 'ecg'
    assert route('Faça prescrição hospitalar pediátrica').module == 'prescricaohospitalarped'
    assert route('Faça evolução na UTI').module == 'evolucaouti'
    assert route('Solicite transferência via regulação').module == 'regulacao'
    assert route('quero consultar dados','passagemplantao').module == 'passagemplantao'
    assert len(REGISTRY)==14


def test_retrieval_source_traceability():
    assert status()['chunks']>40
    hits=retrieve('ECG ritmo QRS frequência cardíaca','ecg',3)
    assert hits and all(h['source'].startswith('knowledge/ecg/') and h['text'] for h in hits)


def test_original_pediatric_script_integration():
    assert calculate('dose-volume',{'weight_kg':20,'dose_mg_kg':10,'concentration_mg_ml':40})=={'dose_mg':'200','volume_ml':'5'}
    assert calculate('dose-volume',{'weight_kg':20,'dose_mg_kg':10,'concentration_mg_ml':40,'max_dose_mg':100})['dose_mg']=='100'
    assert calculate('maintenance',{'weight_kg':15})['holliday_segar_ml_day']=='1250'
    assert calculate('drip',{'volume_ml':120,'hours':2,'drop_factor':20})['rounded_gtt_min']=='20'


def test_api_without_key(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    with TestClient(app) as client:
        assert client.get('/').status_code==200
        assert len(client.get('/api/modules').json())==14
        assert client.get('/api/health').json()['ready'] is False
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


def test_follow_up_keeps_specialist_and_history(monkeypatch):
    from app import agents
    seen={}
    def fake_respond(module,question,snippets,image_urls=None,history=None,clinical_context=''):
        seen.update(module=module,history=history,question=question)
        return 'Rascunho para revisão médica.'
    monkeypatch.setattr(agents,'respond',fake_respond)
    monkeypatch.setenv('OPENAI_API_KEY','dummy')
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
    monkeypatch.setenv('OPENAI_API_KEY','dummy')
    monkeypatch.setenv('FHIR_BASE_URL','https://fhir.example.test/r4')
    monkeypatch.setenv('FHIR_BEARER_TOKEN','dummy-bearer')
    output={}
    monkeypatch.setattr(agents,'respond',lambda module,question,snippets,image_urls=None,history=None,clinical_context='': output.setdefault('context',clinical_context) or 'rascunho')
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
        assert 'm1' in output['context'] and 'm2' not in output['context']
        assert client.post('/api/chat',json={'message':'Liste as prescrições ativas do prontuário'}).status_code==422
        result_auto=client.post('/api/chat',json={'message':'Liste as prescrições ativas do prontuário','patient_id':'42','confirmed_patient_id':True})
        assert result_auto.status_code==200 and result_auto.json()['fhir_used'] is True


def test_multipage_pdf_reaches_specialist_as_images(monkeypatch):
    import base64
    import fitz
    from app import agents
    seen={}
    def fake_respond(module,question,snippets,image_urls=None,history=None,clinical_context=''):
        seen['images']=image_urls
        return 'A análise deve ser revisada.'
    monkeypatch.setattr(agents,'respond',fake_respond)
    monkeypatch.setenv('OPENAI_API_KEY','dummy')
    doc=fitz.open()
    for number in (1,2):
        page=doc.new_page(width=120,height=100)
        page.insert_text((12,30),f'ECG pagina {number}')
    content=base64.b64encode(doc.tobytes()).decode()
    with TestClient(app) as client:
        response=client.post('/api/chat',json={'message':'Analise este ECG','image':content})
        assert response.status_code==200,response.text
        assert len(seen['images'])==2
        assert all(x.startswith('data:image/png;base64,') for x in seen['images'])
