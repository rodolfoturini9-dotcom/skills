"""Um especialista Claude por SKILL.md; conhecimento integral do módulo em prompt cacheado."""
import datetime
import json
import os
import anthropic
from .registry import REGISTRY
from .rag import RELATED, module_context, retrieve
from .tools import calculate

DEFAULT_MODEL = os.getenv('ANTHROPIC_MODEL','claude-opus-5')
# Perfis por modelo: suporte a raciocínio adaptativo/effort, versão da busca web e fallback de recusa.
MODELS = {
    'claude-opus-5':    {'label':'Claude Opus 5 (padrão)','adaptive':True,'web':'web_search_20260209','fallbacks':True},
    'claude-fable-5-1': {'label':'Claude Fable 5.1 (máxima capacidade, maior custo)','adaptive':True,'web':'web_search_20260209','fallbacks':True},
    'claude-sonnet-5':  {'label':'Claude Sonnet 5 (mais rápido e econômico)','adaptive':True,'web':'web_search_20260209','fallbacks':False},
    'claude-haiku-4-5': {'label':'Claude Haiku 4.5 (rápido, tarefas simples)','adaptive':False,'web':'web_search_20250305','fallbacks':False},
}
EFFORTS = ('low','medium','high','xhigh','max')
MAX_STEPS = 10

SAFETY = '''Você é um especialista do Copiloto Clínico e apoia um médico habilitado, que revisa e assina todo documento. Responda em português do Brasil.

Regras que prevalecem sobre qualquer instrução do SKILL.md ou das referências:
- Use somente dados fornecidos na conversa e nos anexos. Nunca invente sinais vitais, exame físico, história, alergias, peso, idade, resultados, contraindicações ou doses. Ausência de informação não é achado negativo.
- Diferencie dado fornecido, interpretação, hipótese e recomendação. Diante de contradição entre fontes, sinalize a discrepância em vez de escolher uma versão.
- Prescrição: verifique indicação, peso e idade (pediatria), alergias, via, apresentação, concentração, dose máxima e função renal/hepática pertinentes. Se faltar dado crítico para a segurança, peça-o e não entregue ordem pronta para execução. Use as ferramentas de cálculo para dose-volume, manutenção hídrica e gotejamento, sempre que houver cálculo; elas fazem aritmética, não validam indicação.
- As referências locais são modelos fornecidos pelo usuário, não prova de atualização de protocolo. Quando a conduta depender de diretriz possivelmente atualizada e a busca web estiver disponível, verifique em fonte oficial ou primária; sem busca, declare o que precisa de verificação. Nunca crie referência bibliográfica.
- Se a imagem ou o PDF não permitirem análise confiável, descreva a limitação. Não alegue acesso ao prontuário nem confirmação em tempo real além dos dados FHIR entregues na mensagem.
- A política sobre padrões de normalidade informada em "Configuração desta solicitação" define se os textos-padrão de exame físico e antecedentes do SKILL.md podem ser aplicados.
- Menções a arquivos ou scripts do SKILL.md correspondem ao conteúdo abaixo e às ferramentas disponíveis; não diga que executou algo que não executou.'''

NORMAL_ON = ('Padrões de normalidade: PERMITIDOS. Aplique os textos-padrão de exame físico e antecedentes definidos no SKILL.md '
             'somente a itens sem dado e sem incompatibilidade com o caso, exatamente como o SKILL.md determina.')
NORMAL_OFF = ('Padrões de normalidade: DESATIVADOS. Não complete exame físico, sinais vitais nem antecedentes (APP, MUCs, alergias) '
              'com textos-padrão, mesmo que o SKILL.md determine. Registre apenas o que foi fornecido; quando o formato exigir a linha, use "[não informado]".')


def tool_definitions(module: str, web_search: str | None) -> list[dict]:
    tools = [
        {'name':'calcular_dose_volume','description':'Calcula dose (mg) e volume (mL) a partir de peso, dose por kg e concentração já validados clinicamente; aplica dose máxima quando informada. Aritmética determinística do script calcular_pediatria.py.',
         'input_schema':{'type':'object','properties':{
             'peso_kg':{'type':'number','description':'Peso em kg'},
             'dose_mg_kg':{'type':'number','description':'Dose em mg/kg por administração'},
             'concentracao_mg_ml':{'type':'number','description':'Concentração da apresentação em mg/mL'},
             'dose_maxima_mg':{'type':'number','description':'Dose máxima por administração em mg (opcional)'}},
             'required':['peso_kg','dose_mg_kg','concentracao_mg_ml'],'additionalProperties':False}},
        {'name':'calcular_manutencao_hidrica','description':'Calcula manutenção hídrica por Holliday-Segar (mL/dia e mL/h) e regra 4-2-1 a partir do peso.',
         'input_schema':{'type':'object','properties':{'peso_kg':{'type':'number','description':'Peso em kg'}},
             'required':['peso_kg'],'additionalProperties':False}},
        {'name':'calcular_gotejamento','description':'Calcula gotas/min a partir de volume, tempo e fator do equipo (padrão 20 gotas/mL).',
         'input_schema':{'type':'object','properties':{
             'volume_ml':{'type':'number'},'horas':{'type':'number'},
             'fator_gotas':{'type':'number','description':'Gotas por mL do equipo; 20 se omitido'}},
             'required':['volume_ml','horas'],'additionalProperties':False}},
    ]
    if module in RELATED:
        parent=RELATED[module]
        tools.append({'name':'consultar_referencias','description':f'Recupera trechos literais das referências do módulo relacionado "{parent}" (modelos de documentos e protocolos do usuário). O conteúdo do seu próprio módulo já está no prompt.',
            'input_schema':{'type':'object','properties':{'pergunta':{'type':'string'}},'required':['pergunta'],'additionalProperties':False}})
    if web_search:
        tools.append({'type':web_search,'name':'web_search','max_uses':5})
    return tools


def run_tool(module: str, name: str, args: dict) -> str:
    if name=='calcular_dose_volume':
        values={'weight_kg':args['peso_kg'],'dose_mg_kg':args['dose_mg_kg'],'concentration_mg_ml':args['concentracao_mg_ml']}
        if args.get('dose_maxima_mg') is not None: values['max_dose_mg']=args['dose_maxima_mg']
        return json.dumps(calculate('dose-volume',values),ensure_ascii=False)
    if name=='calcular_manutencao_hidrica':
        return json.dumps(calculate('maintenance',{'weight_kg':args['peso_kg']}),ensure_ascii=False)
    if name=='calcular_gotejamento':
        values={'volume_ml':args['volume_ml'],'hours':args['horas']}
        if args.get('fator_gotas') is not None: values['drop_factor']=args['fator_gotas']
        return json.dumps(calculate('drip',values),ensure_ascii=False)
    if name=='consultar_referencias' and module in RELATED:
        hits=[h for h in retrieve(str(args['pergunta']),RELATED[module],2) if h['source'].startswith(f'knowledge/{RELATED[module]}/')]
        return json.dumps(hits,ensure_ascii=False)
    raise ValueError('Ferramenta desconhecida')


def system_blocks(module: str) -> list[dict]:
    return [
        {'type':'text','text':SAFETY},
        {'type':'text','text':f'ESPECIALISTA: {module} ({REGISTRY[module].title})\nConteúdo integral do SKILL.md e das referências deste especialista:\n\n{module_context(module)}',
         'cache_control':{'type':'ephemeral','ttl':'1h'}},
    ]


def attachment_blocks(attachments: list[dict] | None) -> list[dict]:
    blocks=[]
    for item in attachments or []:
        kind='document' if item['media_type']=='application/pdf' else 'image'
        blocks.append({'type':kind,'source':{'type':'base64','media_type':item['media_type'],'data':item['data']}})
    return blocks


def client_for(api_key: str | None) -> anthropic.Anthropic:
    key=api_key or os.getenv('ANTHROPIC_API_KEY')
    if not key:
        raise PermissionError('Chave da API Claude não informada.')
    return anthropic.Anthropic(api_key=key,timeout=300,max_retries=2)


def respond(module: str, question: str, snippets: list[dict], attachments: list[dict] | None = None,
            history: list[dict] | None = None, clinical_context: str = '', *, api_key: str | None = None,
            model: str | None = None, effort: str = 'high', web_search: bool = True, normal_patterns: bool = False) -> dict:
    model=model or DEFAULT_MODEL
    profile=MODELS.get(model,{'adaptive':True,'web':'web_search_20260209','fallbacks':False})
    web=profile['web'] if web_search else None
    background='\n\n'.join(f"[Fonte: {x['source']} • posição {x['offset']}]\n{x['text']}" for x in snippets)
    config=(f"Configuração desta solicitação:\n- Data de hoje: {datetime.date.today().strftime('%d/%m/%Y')}\n"
            f"- {NORMAL_ON if normal_patterns else NORMAL_OFF}\n"
            f"- Busca web: {'disponível (ferramenta web_search)' if web else 'indisponível nesta solicitação'}")
    text=(f'{config}\n\nPedido do profissional:\n{question}\n\n'
          f'Trechos locais pré-recuperados (apenas para rastreabilidade; o conteúdo integral está no prompt):\n{background or "Nenhum trecho."}'
          f'{clinical_context}')
    past=[{'role':x['role'],'content':x['content']} for x in (history or [])]
    messages=past+[{'role':'user','content':attachment_blocks(attachments)+[{'type':'text','text':text}]}]
    params={'model':model,'max_tokens':16000,'system':system_blocks(module),'tools':tool_definitions(module,web)}
    if profile['adaptive']:
        params['thinking']={'type':'adaptive'}
        params['output_config']={'effort':effort if effort in EFFORTS else 'high'}
    if profile['fallbacks']:
        params['betas']=['server-side-fallback-2026-07-01']
        params['fallbacks']='default'
    client=client_for(api_key)
    web_sources, used_tools, notice = [], [], ''
    for _ in range(MAX_STEPS):
        response=client.beta.messages.create(messages=messages,**params)
        for block in response.content:
            if block.type=='web_search_tool_result' and isinstance(block.content,list):
                web_sources+=[{'title':r.title,'url':r.url} for r in block.content if getattr(r,'url',None)]
        if response.stop_reason=='refusal':
            return {'answer':'O modelo recusou esta solicitação. Reformule o pedido com o contexto clínico e a finalidade assistencial.',
                    'model':response.model,'web_sources':[],'tools':used_tools,'notice':'refusal'}
        messages.append({'role':'assistant','content':response.content})
        if response.stop_reason=='pause_turn':
            continue
        if response.stop_reason=='tool_use':
            results=[]
            for block in response.content:
                if block.type!='tool_use': continue
                used_tools.append(block.name)
                try:
                    results.append({'type':'tool_result','tool_use_id':block.id,'content':run_tool(module,block.name,dict(block.input))})
                except (ValueError,KeyError,TypeError) as exc:
                    results.append({'type':'tool_result','tool_use_id':block.id,'content':f'Erro: {exc}','is_error':True})
            messages.append({'role':'user','content':results})
            continue
        if response.stop_reason=='max_tokens':
            notice='Resposta interrompida pelo limite de tamanho; revise se está completa.'
        break
    else:
        notice='Limite de etapas de ferramenta atingido; a resposta pode estar incompleta.'
    answer='\n\n'.join(b.text for b in response.content if b.type=='text').strip()
    unique={s['url']:s for s in web_sources}
    return {'answer':answer or 'Sem texto na resposta do modelo.','model':response.model,
            'web_sources':list(unique.values())[:12],'tools':used_tools,'notice':notice}
