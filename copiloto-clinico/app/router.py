"""Roteamento determinístico, auditável, com regra de especificidade."""
import re
import unicodedata
from dataclasses import dataclass
from .registry import REGISTRY

@dataclass(frozen=True)
class Route:
    module: str
    reason: str


def normal(text: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFKD', text.lower()) if not unicodedata.combining(c))


def route(text: str, requested: str = 'auto') -> Route:
    if requested != 'auto':
        if requested not in REGISTRY:
            raise ValueError('Especialista inválido')
        return Route(requested, 'selecionado pelo usuário')
    t = normal(text)
    explicit = re.search(r'(?:^|\s)[@/]([a-z]+)\b', t)
    if explicit and explicit.group(1) in REGISTRY:
        return Route(explicit.group(1), 'comando explícito')
    pediatric = bool(re.search(r'\b(pediatr|crianca|lactente|recem.nascid|neonat|infantil|menino|menina|adolescente|[0-9]+\s*(?:meses|anos))', t))
    hospital = bool(re.search(r'\b(hospital|internad|enfermaria|prescricao hospitalar|uti|leito)', t))
    if re.search(r'\b(ecg|eletrocardiograma|eletrocardiograf)', t):
        return Route('ecg','ECG identificado')
    if re.search(r'\b(maternidade|obstetr|gestante|parto|puerper|gravidez|prenatal)', t):
        return Route('maternidade','contexto obstétrico')
    if re.search(r'\b(plantao|handoff|passagem de caso)', t):
        return Route('passagemplantao','passagem de plantão')
    if re.search(r'\b(regulacao|vaga|transferencia|central de leitos)', t):
        return Route('regulacao','regulação')
    if re.search(r'\b(admissao|admitir|admitido)', t):
        return Route('admissaoped' if pediatric else 'admissao','admissão e faixa etária')
    if re.search(r'\b(evolucao|evoluir)', t) and re.search(r'\b(uti|terapia intensiva)', t):
        return Route('evolucaouti','evolução em UTI')
    if re.search(r'\b(prescri|receita|medicamento|dose)', t):
        module = ('prescricaohospitalarped' if pediatric else 'prescricaohospitalar') if hospital else ('prescricaoambulatorioped' if pediatric else 'prescricaoambulatorio')
        return Route(module,'prescrição: contexto e faixa etária')
    if re.search(r'\b(uti|terapia intensiva|ventilacao mecanica|vasopressor)', t):
        return Route('uti','terapia intensiva')
    if hospital:
        return Route('hospital','contexto hospitalar')
    return Route('consultorio','atendimento geral')
