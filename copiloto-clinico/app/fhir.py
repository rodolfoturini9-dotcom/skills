"""Leitura opcional de MedicationRequest FHIR R4; nenhuma gravação no prontuário."""
import os
import re
from urllib.parse import urlparse
import httpx

class FHIRConfigurationError(Exception):
    pass

class FHIRLookupError(Exception):
    pass


def configured() -> bool:
    return bool(os.getenv('FHIR_BASE_URL') and os.getenv('FHIR_BEARER_TOKEN'))


def medication_requests(patient_id: str) -> list[dict]:
    """Busca até 50 prescrições por identificador técnico FHIR explícito."""
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,64}',patient_id):
        raise ValueError('ID FHIR inválido; utilize o ID técnico do Patient.')
    if not configured():
        raise FHIRConfigurationError('FHIR_BASE_URL e FHIR_BEARER_TOKEN precisam ser configurados.')
    base=os.environ['FHIR_BASE_URL'].rstrip('/')
    parsed=urlparse(base)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password:
        raise FHIRConfigurationError('FHIR_BASE_URL deve usar HTTPS e não conter credenciais.')
    headers={'Authorization': 'Bearer '+os.environ['FHIR_BEARER_TOKEN'],'Accept':'application/fhir+json'}
    try:
        with httpx.Client(timeout=12,follow_redirects=False) as client:
            response=client.get(base+'/MedicationRequest',params={'patient':patient_id,'_count':50},headers=headers)
            response.raise_for_status()
            bundle=response.json()
    except (httpx.HTTPError,ValueError) as exc:
        raise FHIRLookupError('Não foi possível consultar o servidor FHIR.') from exc
    if bundle.get('resourceType')!='Bundle':
        raise FHIRLookupError('Resposta FHIR sem Bundle.')
    output=[]
    for entry in bundle.get('entry',[])[:50]:
        resource=entry.get('resource',{})
        if resource.get('resourceType')!='MedicationRequest': continue
        subject=resource.get('subject',{}).get('reference','')
        if subject not in (f'Patient/{patient_id}',f'{base}/Patient/{patient_id}'):
            continue  # O filtro do servidor não substitui a verificação local.
        med=resource.get('medicationCodeableConcept',{})
        label=med.get('text') or next((x.get('display') for x in med.get('coding',[]) if x.get('display')),None)
        if not label: label=resource.get('medicationReference',{}).get('display')
        dosages=resource.get('dosageInstruction',[])
        output.append({'id':resource.get('id'),'status':resource.get('status'),
            'medication':label or '[não informado]',
            'dosage':[d.get('text') or '[não informado]' for d in dosages],
            'route':[d.get('route',{}).get('text') or '[não informado]' for d in dosages],
            'frequency':[d.get('timing',{}).get('code',{}).get('text') or '[não informado]' for d in dosages],
            'period':resource.get('dispenseRequest',{}).get('validityPeriod') or {},
            'authored_on':resource.get('authoredOn')})
    return output
