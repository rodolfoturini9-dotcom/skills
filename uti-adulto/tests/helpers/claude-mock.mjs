// Simula a API da Anthropic no nível HTTP (SSE real), exercitando o SDK oficial de ponta a ponta.
const enc = new TextEncoder();
function sse(events) {
  return new ReadableStream({start(c) { for (const [type, data] of events) c.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify({type, ...data})}\n\n`)); c.close(); }});
}
// reply: {text} | {tools:[{name,input}]} | {stop_reason:'refusal'|'max_tokens', text?}
function events(model, reply, n) {
  const ev = [['message_start', {message: {id: 'msg_synthetic_' + n, type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: {input_tokens: 100, output_tokens: 0}}}]];
  let i = 0;
  if (reply.text !== undefined) {
    ev.push(['content_block_start', {index: i, content_block: {type: 'text', text: ''}}], ['content_block_delta', {index: i, delta: {type: 'text_delta', text: reply.text}}], ['content_block_stop', {index: i}]); i += 1;
  }
  for (const [k, t] of (reply.tools || []).entries()) {
    ev.push(['content_block_start', {index: i, content_block: {type: 'tool_use', id: `toolu_${n}_${k}`, name: t.name, input: {}}}], ['content_block_delta', {index: i, delta: {type: 'input_json_delta', partial_json: JSON.stringify(t.input || {})}}], ['content_block_stop', {index: i}]); i += 1;
  }
  ev.push(['message_delta', {delta: {stop_reason: reply.stop_reason || (reply.tools?.length ? 'tool_use' : 'end_turn'), stop_sequence: null, ...(reply.stop_details ? {stop_details: reply.stop_details} : {})}, usage: {output_tokens: 50}}], ['message_stop', {}]);
  return ev;
}
export function mockClaude(respond) {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url instanceof Request ? url.url : url);
    if (!u.startsWith('https://api.anthropic.com/')) return original(url, init);
    const body = JSON.parse(init.body);
    const headers = new Headers(init.headers);
    calls.push({url: u, body, headers});
    const reply = await respond(body, calls.length);
    if (body.stream) return new Response(sse(events(body.model, reply, calls.length)), {headers: {'content-type': 'text/event-stream'}});
    return Response.json({id: 'msg_synthetic_' + calls.length, type: 'message', role: 'assistant', model: body.model, content: [{type: 'text', text: reply.text ?? ''}], stop_reason: reply.stop_reason || 'end_turn', stop_sequence: null, usage: {input_tokens: 10, output_tokens: 5}});
  };
  return {calls, restore: () => { globalThis.fetch = original; }};
}
export const KEY = {apiKey: 'sk-ant-synthetic-test'};
