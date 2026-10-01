import {createClient} from '@libsql/client';
import {readFile,readdir} from 'node:fs/promises';
if(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN)throw Error('Configure as variáveis Turso no arquivo .env.');
const db=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
await db.execute('CREATE TABLE IF NOT EXISTS netlify_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
const done=new Set((await db.execute('SELECT name FROM netlify_migrations')).rows.map(r=>r.name));
for(const name of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort()){
 if(done.has(name))continue;
 const sql=await readFile('drizzle/'+name,'utf8');
 const statements=sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
 await db.batch([...statements,{sql:'INSERT INTO netlify_migrations(name,applied_at) VALUES (?,?)',args:[name,new Date().toISOString()]}],'write');
 console.log('Aplicada:',name);
}
db.close();
