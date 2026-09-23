"""Um agente LangChain por SKILL.md; ferramentas limitadas ao escopo selecionado."""
import json
import os
from functools import lru_cache
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from .registry import KNOWLEDGE, REGISTRY
from .rag import retrieve
from .tools import calculate

SAFETY = '''REGRAS PRIORITÁRIAS PARA TODOS OS ESPECIALISTAS:
Responda em português do Brasil e como apoio a um profissional habilitado; decisão e assinatura clínicas exigem conferência humana. Nunca invente sinais vitais, exame físico, história, alergias, pesos, idade, resultados, contraindicações ou doses. Identifique fatos fornecidos, hipóteses e dados ausentes. Se um exemplo ou SKILL.md sugere completar achados normais automaticamente, ignore essa parte. Para prescrição, valide paciente, indicação, peso e idade quando pediátrico, alergias, via, concentração, dose máxima, função renal e parâmetros pertinentes; se faltar dado crítico, peça-o e não apresente ordem pronta para execução. Os textos em references são modelos e material fornecido pelo usuário, não prova de atualização ou validade de protocolo. Referencie a fonte local com caminho e trecho recuperado, sem afirmar que realizou busca externa. Se a imagem não permitir análise confiável, explicite limitações. Não alegue acesso ao prontuário nem confirmação em tempo real.
'''


def tools_for(module: str):
    @tool
    def consultar_referencias(pergunta: str) -> str:
        """Recupera trechos exatos dos arquivos SKILL.md e references/ do especialista atual."""
        return json.dumps(retrieve(pergunta,module,4),ensure_ascii=False)

    @tool
    def calcular_dose_volume_pediatrico(peso_kg: float, dose_mg_kg: float, concentracao_mg_ml: float, dose_maxima_mg: float | None = None) -> str:
        """Calcula dose em mg e volume em mL, apenas após dose e concentração validadas clinicamente."""
        args={'weight_kg':peso_kg,'dose_mg_kg':dose_mg_kg,'concentration_mg_ml':concentracao_mg_ml}
        if dose_maxima_mg is not None: args['max_dose_mg']=dose_maxima_mg
        return json.dumps(calculate('dose-volume',args),ensure_ascii=False)

    @tool
    def calcular_manutencao_pediatrica(peso_kg: float) -> str:
        """Calcula Holliday-Segar e regra 4-2-1; interpretar com estado clínico antes de prescrever."""
        return json.dumps(calculate('maintenance',{'weight_kg':peso_kg}),ensure_ascii=False)

    @tool
    def calcular_gotejamento(volume_ml: float, horas: float, fator_gotas: float = 20) -> str:
        """Calcula gotas/minuto a partir de volume, tempo e fator do equipo informados."""
        return json.dumps(calculate('drip',{'volume_ml':volume_ml,'hours':horas,'drop_factor':fator_gotas}),ensure_ascii=False)

    return [consultar_referencias,calcular_dose_volume_pediatrico,calcular_manutencao_pediatrica,calcular_gotejamento]


@lru_cache(maxsize=14)
def specialist(module: str):
    if module not in REGISTRY: raise ValueError('Especialista desconhecido')
    skill=(KNOWLEDGE/module/'SKILL.md').read_text(encoding='utf-8')
    model=ChatOpenAI(model=os.getenv('OPENAI_MODEL','gpt-4.1'),temperature=0,timeout=90,max_retries=1)
    return create_agent(model=model,tools=tools_for(module),system_prompt=SAFETY+'\nSKILL.md DO ESPECIALISTA:\n'+skill)


def respond(module: str, question: str, snippets: list[dict], image_urls: list[str] | None = None,
            history: list[dict] | None = None, clinical_context: str = '') -> str:
    background='\n\n'.join(f"[Fonte: {x['source']} • posição {x['offset']}]\n{x['text']}" for x in snippets)
    content=[{'type':'text','text':f'Pedido do profissional:\n{question}\n\nTrechos locais recuperados:\n{background or "Nenhum trecho."}\n{clinical_context}\nCite apenas fontes que fundamentem sua resposta.'}]
    for image_url in image_urls or []:
        content.append({'type':'image_url','image_url':{'url':image_url}})
    past = [HumanMessage(content=x['content']) if x['role']=='user' else AIMessage(content=x['content'])
            for x in (history or [])]
    result=specialist(module).invoke({'messages':past+[HumanMessage(content=content)]},{'recursion_limit':12})
    message=result['messages'][-1]
    return message.content if isinstance(message.content,str) else json.dumps(message.content,ensure_ascii=False)
