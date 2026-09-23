"""Registro fechado dos especialistas distribuídos no pacote."""
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE = ROOT / 'knowledge'

@dataclass(frozen=True)
class Specialist:
    key: str
    title: str
    description: str

SPECS = [
    Specialist('admissao','Admissão adulta','Admissão hospitalar de adulto'),
    Specialist('admissaoped','Admissão pediátrica','Admissão hospitalar pediátrica'),
    Specialist('ecg','ECG','Análise de eletrocardiograma'),
    Specialist('evolucaouti','Evolução UTI','Evolução médica de terapia intensiva'),
    Specialist('passagemplantao','Passagem de plantão','Handoff estruturado'),
    Specialist('prescricaoambulatorio','Prescrição ambulatorial','Prescrição adulta ambulatorial'),
    Specialist('prescricaoambulatorioped','Prescrição ambulatorial pediátrica','Prescrição pediátrica ambulatorial'),
    Specialist('prescricaohospitalar','Prescrição hospitalar','Prescrição adulta hospitalar'),
    Specialist('prescricaohospitalarped','Prescrição hospitalar pediátrica','Prescrição pediátrica hospitalar'),
    Specialist('regulacao','Regulação','Transferência, vaga e regulação'),
    Specialist('consultorio','Consultório','Documentos e atendimento ambulatorial'),
    Specialist('hospital','Hospital','Documentos e atendimento hospitalar'),
    Specialist('uti','UTI','Protocolos e rotinas de UTI adulta'),
    Specialist('maternidade','Maternidade','Documentação clínica em maternidade'),
]
REGISTRY = {spec.key: spec for spec in SPECS}
assert all((KNOWLEDGE / key / 'SKILL.md').exists() for key in REGISTRY)
