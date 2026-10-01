// Camada de compatibilidade: expõe a API usada pelo código (prepare/bind/all/first/run/batch,
// no formato do Cloudflare D1) sobre PostgreSQL (Netlify Database em produção, PGlite nos testes).

// Tabelas cujo identificador numérico é gerado pelo banco (meta.last_row_id).
const GENERATED_ID = {
 events: 'id', tasks: 'id', evolutions: 'id', medical_documents: 'id', prescribers: 'id',
 custom_medications: 'id', daily_goals: 'id', clinical_audit: 'id', clinical_records: 'sequence',
};
// Todas as escritas em lote ou transação são serializadas por esta trava consultiva.
const WRITE_LOCK = 724031;

// Converte placeholders "?" em "$n", ignorando literais e identificadores entre aspas.
export function toPostgres(sql) {
 let out = '', n = 0, quote = '';
 for (let i = 0; i < sql.length; i += 1) {
  const c = sql[i];
  if (quote) { out += c; if (c === quote) quote = ''; continue; }
  if (c === "'" || c === '"') { quote = c; out += c; continue; }
  out += c === '?' ? '$' + (++n) : c;
 }
 // Postgres converte apelidos sem aspas para minúsculas; o código espera camelCase.
 out = out.replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b/g, (m, alias) => /[A-Z]/.test(alias) ? `AS "${alias}"` : m);
 const insert = /^\s*INSERT\s+INTO\s+([a-z_]+)/i.exec(out);
 if (insert && GENERATED_ID[insert[1]] && !/\bRETURNING\b/i.test(out)) out += ` RETURNING ${GENERATED_ID[insert[1]]} AS "__rowid"`;
 return out;
}

const normalizeValue = v => (typeof v === 'bigint' ? Number(v) : v === undefined ? null : v);
const normalizeParam = v => (typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : v);

// int8 (COUNT, bigint) e numeric chegam como texto no driver pg; o código espera números.
const NUMERIC_TYPES = new Set([20, 1700]);
function convert(result) {
 const numeric = new Set((result.fields || []).filter(f => NUMERIC_TYPES.has(f.dataTypeID)).map(f => f.name));
 const rows = (result.rows || []).map(row => {
  const out = {};
  for (const [k, v] of Object.entries(row)) if (k !== '__rowid') out[k] = numeric.has(k) && typeof v === 'string' ? Number(v) : normalizeValue(v);
  return out;
 });
 const generated = result.rows?.[0]?.__rowid;
 return { success: true, results: rows, meta: { changes: result.rowCount ?? result.affectedRows ?? 0, last_row_id: generated == null ? 0 : Number(generated) } };
}

// executor: { query(text, params) => {rows,rowCount}, transaction(fn) => fn(txExecutor) }
export function createDatabase(executor) {
 class Statement {
  constructor(sql, args = [], exec = executor) { this.sql = sql; this.args = args; this.exec = exec; }
  bind(...args) { return new Statement(this.sql, args, this.exec); }
  async all() { return convert(await this.exec.query(toPostgres(this.sql), this.args.map(normalizeParam))); }
  async run() { return this.all(); }
  async first(column) { const row = (await this.all()).results[0] || null; return column ? row?.[column] ?? null : row; }
 }
 const lock = tx => tx.query('SELECT pg_advisory_xact_lock($1)', [WRITE_LOCK]);
 const api = {
  dialect: 'postgres',
  prepare: sql => new Statement(sql),
  // Lote atômico: todas as instruções ou nenhuma.
  batch: statements => executor.transaction(async tx => {
   await lock(tx);
   const results = [];
   for (const s of statements) results.push(convert(await tx.query(toPostgres(s.sql), s.args.map(normalizeParam))));
   return results;
  }),
  // Transação serializada com a mesma API de prepare dentro do callback.
  transaction: fn => executor.transaction(async tx => {
   await lock(tx);
   return fn({ dialect: 'postgres', prepare: sql => new Statement(sql, [], tx) });
  }),
 };
 return api;
}

// Executor para pg.Pool ou Pool do Neon serverless (mesma interface).
export function poolExecutor(pool) {
 return {
  query: (text, params) => pool.query(text, params),
  async transaction(fn) {
   const client = await pool.connect();
   try {
    await client.query('BEGIN');
    const value = await fn({ query: (text, params) => client.query(text, params) });
    await client.query('COMMIT');
    return value;
   } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
   } finally { client.release(); }
  },
 };
}

// Executor para PGlite (testes locais com Postgres real em WebAssembly).
export function pgliteExecutor(pg) {
 return {
  query: (text, params) => pg.query(text, params),
  transaction: fn => pg.transaction(tx => fn({ query: (text, params) => tx.query(text, params) })),
 };
}

let db;
export async function getDatabase() {
 if (db) return db;
 const { getDatabase: netlifyDatabase } = await import('@netlify/database');
 const connection = netlifyDatabase();
 db = createDatabase(poolExecutor(connection.pool));
 return db;
}
