// Após o build do Vite, embute as páginas HTML na função para servi-las somente após a autenticação,
// sem depender de leitura de arquivos no ambiente da função.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const pages={'index.html':'dist/index.html','ficha-uti/index.html':'dist/ficha-uti/index.html','ficha-uti-integrada.html':'dist/ficha-uti-integrada.html'};
const out={};
for(const [key,file] of Object.entries(pages))out[key]=await readFile(file,'utf8');
await mkdir('netlify/functions/_generated',{recursive:true});
await writeFile('netlify/functions/_generated/pages.mjs','// Gerado por scripts/embed-pages.mjs. Não editar.\nexport default '+JSON.stringify(out)+';\n');
console.log('Páginas embutidas:',Object.keys(out).join(', '));
