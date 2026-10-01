// Integração central com Claude (Anthropic) — substitui a antiga chamada à OpenAI.
// Todas as funções de IA do sistema passam por aqui: saída JSON estruturada (structured outputs),
// fallback de recusa no servidor, tratamento de erros tipados e contabilização de uso por requisição.
import Anthropic from '@anthropic-ai/sdk';
import {AsyncLocalStorage} from 'node:async_hooks';

export const DEFAULT_MODEL = 'claude-opus-5-5';
// Preço por milhão de tokens (entrada / saída) para estimativa de custo no painel de IA.
export const MODEL_PRICING: Record<string, {input: number; output: number}> = {
  'claude-opus-5-5': {input: 4, output: 20},
  'claude-opus-5': {input: 5, output: 25},
  'claude-opus-4-8': {input: 5, output: 25},
  'claude-sonnet-5-5': {input: 2, output: 10},
  'claude-haiku-4-5': {input: 1, output: 5},
};

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export interface ClaudeConfig {apiKey: string; model?: string; fallbacks?: boolean; baseURL?: string}
export interface UsageEntry {model: string; inputTokens: number; outputTokens: number; requestId: string}

// Coleta o uso de tokens das chamadas feitas dentro de um job (sem variáveis globais compartilhadas).
const usageScope = new AsyncLocalStorage<UsageEntry[]>();
export function collectUsage<T>(fn: () => Promise<T>): Promise<{value: T; usage: UsageEntry[]}> {
  const usage: UsageEntry[] = [];
  return usageScope.run(usage, async () => ({value: await fn(), usage}));
}

export class ClaudeError extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}

export function configFromEnv(env: {ANTHROPIC_API_KEY?: string; ANTHROPIC_MODEL?: string; ANTHROPIC_FALLBACKS?: string}): ClaudeConfig {
  return {apiKey: env.ANTHROPIC_API_KEY || '', model: env.ANTHROPIC_MODEL || DEFAULT_MODEL, fallbacks: env.ANTHROPIC_FALLBACKS !== 'off'};
}

// Structured outputs exige additionalProperties:false e não aceita limites numéricos/de tamanho.
// Campos opcionais viram obrigatórios anuláveis; os nulos são removidos depois (dropNull).
const UNSUPPORTED = ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'multipleOf', 'exclusiveMinimum', 'exclusiveMaximum', 'pattern'];
export function strictSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  const clean = Object.fromEntries(Object.entries(schema).filter(([k]) => !UNSUPPORTED.includes(k)));
  if (clean.type === 'object' && clean.properties) {
    const required = new Set<string>((schema.required as string[]) || []);
    return {...clean, additionalProperties: false, required: Object.keys(clean.properties as object),
      properties: Object.fromEntries(Object.entries(clean.properties as Record<string, any>).map(([k, v]) => [k, required.has(k) ? strictSchema(v) : {anyOf: [strictSchema(v), {type: 'null'}]}]))};
  }
  if (clean.type === 'array') return {...clean, items: strictSchema(clean.items)};
  if (clean.anyOf) return {...clean, anyOf: (clean.anyOf as any[]).map(strictSchema)};
  return clean;
}
export function dropNull(value: any): any {
  if (Array.isArray(value)) return value.map(dropNull).filter((x) => x !== null);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, dropNull(v)]));
  return value;
}

// Converte "data:image/png;base64,..." em bloco de imagem da Messages API.
export function imageBlock(dataUrl: string): Anthropic.Beta.BetaImageBlockParam {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new ClaudeError('Imagem inválida: use JPEG, PNG ou WEBP.', 400);
  return {type: 'image', source: {type: 'base64', media_type: m[1] as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: m[2]}};
}

export function clientFor(config: ClaudeConfig) {
  if (!config.apiKey) throw new ClaudeError('IA não configurada: cadastre ANTHROPIC_API_KEY no Netlify.', 503);
  // baseURL explícita: evita que uma variável ANTHROPIC_BASE_URL do ambiente desvie as chamadas.
  return new Anthropic({apiKey: config.apiKey, baseURL: config.baseURL || 'https://api.anthropic.com', maxRetries: 2, timeout: 10 * 60 * 1000});
}

function translateError(error: unknown): ClaudeError {
  if (error instanceof ClaudeError) return error;
  if (error instanceof Anthropic.AuthenticationError) return new ClaudeError('Chave da API Anthropic inválida ou revogada. Revise ANTHROPIC_API_KEY.', 503);
  if (error instanceof Anthropic.PermissionDeniedError) return new ClaudeError('A chave da API não tem permissão para este modelo ou recurso.', 503);
  if (error instanceof Anthropic.NotFoundError) return new ClaudeError('Modelo de IA não encontrado. Revise ANTHROPIC_MODEL.', 503);
  if (error instanceof Anthropic.RateLimitError) return new ClaudeError('Limite de uso da API Anthropic atingido. Tente novamente em instantes.', 429);
  if (error instanceof Anthropic.BadRequestError) return new ClaudeError('Requisição recusada pela API Anthropic: ' + error.message.slice(0, 300), 400);
  if (error instanceof Anthropic.APIConnectionError) return new ClaudeError('Sem conexão com a API Anthropic. Tente novamente.', 503);
  if (error instanceof Anthropic.APIError) return new ClaudeError(`Falha na API Anthropic (${error.status ?? 'sem status'}).`, 502);
  if (error instanceof SyntaxError) return new ClaudeError('A IA retornou JSON inválido. Gere novamente.', 502);
  return new ClaudeError(error instanceof Error ? error.message : 'Falha na geração por IA.', 502);
}

function record(message: {model: string; id: string; usage: {input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null}}) {
  const u = message.usage;
  usageScope.getStore()?.push({model: message.model, requestId: message.id,
    inputTokens: u.input_tokens + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), outputTokens: u.output_tokens});
}

function assertUsable(message: Anthropic.Beta.BetaMessage) {
  if (message.stop_reason === 'refusal') {
    const category = message.stop_details?.category;
    throw new ClaudeError('A IA recusou a solicitação' + (category ? ` (categoria: ${category})` : '') + '. Revise o conteúdo ou use o preenchimento manual.', 422);
  }
  if (message.stop_reason === 'max_tokens') throw new ClaudeError('Resposta incompleta (limite de tamanho). Gere para um paciente ou período por vez.', 422);
}

export interface JsonRequest {
  system: string;
  content: string | Anthropic.Beta.BetaContentBlockParam[];
  schema: any;
  maxTokens?: number;
  effort?: Effort;
  signal?: AbortSignal;
}

// Chamada única com saída JSON garantida pelo schema. Streaming evita timeouts em respostas longas.
export async function claudeJSON(config: ClaudeConfig, req: JsonRequest): Promise<{value: any; model: string; requestId: string}> {
  const client = clientFor(config);
  const schema = strictSchema(req.schema);
  try {
    const stream = client.beta.messages.stream({
      model: config.model || DEFAULT_MODEL,
      max_tokens: req.maxTokens ?? 32000,
      system: req.system,
      messages: [{role: 'user', content: req.content}],
      output_config: {effort: req.effort ?? 'medium', format: {type: 'json_schema', schema}},
      ...(config.fallbacks === false ? {} : {betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const}),
    }, {signal: req.signal});
    const message = await stream.finalMessage();
    record(message);
    assertUsable(message);
    const text = message.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('');
    if (!text) throw new ClaudeError('A IA retornou conteúdo vazio.', 502);
    return {value: dropNull(JSON.parse(text)), model: message.model, requestId: message.id};
  } catch (error) {
    throw translateError(error);
  }
}

// Ferramenta de leitura usada pelo assistente: executada no servidor, nunca grava dados.
export interface ReadTool {definition: Anthropic.Beta.BetaTool; run(input: any): unknown}

// Loop de ferramentas somente leitura (assistente clínico). Retorna o texto final e as ferramentas usadas.
export async function claudeAgent(config: ClaudeConfig, {system, question, tools, maxTurns = 8, effort = 'medium'}: {system: string; question: string; tools: ReadTool[]; maxTurns?: number; effort?: Effort}) {
  const client = clientFor(config);
  const byName = new Map(tools.map((t) => [t.definition.name, t]));
  const messages: Anthropic.Beta.BetaMessageParam[] = [{role: 'user', content: question}];
  const used: string[] = [];
  try {
    for (let turn = 0; turn < maxTurns; turn += 1) {
      const message = await client.beta.messages.stream({
        model: config.model || DEFAULT_MODEL,
        max_tokens: 16000,
        system,
        tools: tools.map((t) => t.definition),
        messages,
        output_config: {effort},
        ...(config.fallbacks === false ? {} : {betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const}),
      }).finalMessage();
      record(message);
      assertUsable(message);
      messages.push({role: 'assistant', content: message.content as Anthropic.Beta.BetaContentBlockParam[]});
      if (message.stop_reason === 'pause_turn') continue;
      const calls = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (!calls.length) {
        const answer = message.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
        return {answer, toolsUsed: used, model: message.model, requestId: message.id};
      }
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = calls.map((call) => {
        const tool = byName.get(call.name);
        used.push(call.name);
        if (!tool) return {type: 'tool_result', tool_use_id: call.id, content: 'Ferramenta inexistente.', is_error: true};
        try { return {type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(tool.run(call.input ?? {}) ?? null)}; }
        catch (e) { return {type: 'tool_result', tool_use_id: call.id, content: e instanceof Error ? e.message : 'Falha na ferramenta.', is_error: true}; }
      });
      messages.push({role: 'user', content: results});
    }
    throw new ClaudeError('O assistente excedeu o número de consultas aos registros. Reformule a pergunta de forma mais específica.', 422);
  } catch (error) {
    throw translateError(error);
  }
}

// Teste de conectividade: chamada mínima para validar chave e modelo.
export async function claudePing(config: ClaudeConfig) {
  const client = clientFor(config);
  try {
    const message = await client.messages.create({model: config.model || DEFAULT_MODEL, max_tokens: 2000, output_config: {effort: 'low'}, messages: [{role: 'user', content: 'Responda somente com a palavra OK.'}]});
    record(message as any);
    const text = message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
    return {ok: true, model: message.model, reply: text.slice(0, 40), requestId: message.id};
  } catch (error) {
    throw translateError(error);
  }
}
