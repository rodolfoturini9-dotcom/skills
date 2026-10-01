import {createClient} from '@libsql/client';
export function createDatabase(client) {
 const convert=r=>({success:true,results:r.rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='bigint'?Number(v):v]))),meta:{changes:r.rowsAffected,last_row_id:Number(r.lastInsertRowid||0)}});
 class Statement {
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async all(){return convert(await client.execute({sql:this.sql,args:this.args}));}
  async run(){return this.all();}
  async first(column){const row=(await this.all()).results[0]||null;return column?row?.[column]??null:row;}
 }
 return {prepare:sql=>new Statement(sql),batch:async statements=>(await client.batch(statements.map(s=>({sql:s.sql,args:s.args})),'write')).map(convert)};
}
let db;
export function getDatabase(){
 if(!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)throw Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
 return db??=createDatabase(createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN}));
}
