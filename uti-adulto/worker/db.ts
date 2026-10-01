// Contrato da camada de dados (server/database.mjs): API no formato D1 sobre PostgreSQL.
export type Row = Record<string, any>;
export interface QueryResult<T = Row> { success: boolean; results: T[]; meta: { changes: number; last_row_id: number } }
export interface Statement {
  bind(...values: unknown[]): Statement;
  all<T = Row>(): Promise<QueryResult<T>>;
  run<T = Row>(): Promise<QueryResult<T>>;
  first<T = Row>(column?: string): Promise<T | null>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<QueryResult[]>;
  transaction<T>(fn: (tx: Pick<Database, 'prepare'>) => Promise<T>): Promise<T>;
}
