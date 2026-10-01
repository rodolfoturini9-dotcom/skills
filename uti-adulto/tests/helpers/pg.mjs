// Banco PostgreSQL real em memória (PGlite) com o mesmo esquema aplicado no Netlify Database.
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createDatabase,pgliteExecutor,toPostgres} from '../../server/database.mjs';
export async function migrate(pg){
 for(const dir of fs.readdirSync('netlify/database/migrations').sort())await pg.exec(fs.readFileSync(`netlify/database/migrations/${dir}/migration.sql`,'utf8'));
}
// sql: acesso direto para preparar/inspecionar cenários nos testes (API assíncrona).
export async function database(){
 const pg=new PGlite();await migrate(pg);
 const db=createDatabase(pgliteExecutor(pg));
 const norm=r=>r?Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='bigint'?Number(v):v])):r;
 const sql={
  prepare:text=>({
   get:async(...args)=>norm((await pg.query(toPostgres(text),args)).rows[0])||null,
   all:async(...args)=>(await pg.query(toPostgres(text),args)).rows.map(norm),
   run:async(...args)=>{const r=await pg.query(toPostgres(text),args);return {changes:r.affectedRows};},
  }),
  exec:text=>pg.exec(text),
  close:()=>pg.close(),
 };
 return {db,sql,pg};
}
