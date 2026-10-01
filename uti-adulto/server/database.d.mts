import type {Database} from '../worker/db';
export function toPostgres(sql: string): string;
export function createDatabase(executor: unknown): Database;
export function poolExecutor(pool: unknown): unknown;
export function pgliteExecutor(pg: unknown): unknown;
export function getDatabase(): Promise<Database>;
