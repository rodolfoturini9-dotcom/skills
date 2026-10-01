// PDF QA harness: runtime paths can be supplied without changing project dependencies.
const {chromium}=await import(process.env.PEP_PLAYWRIGHT_MODULE||'playwright-core');

import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.PEP_CHROMIUM_EXECUTABLE||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});const results={};
for(const scenario of ['normal','long-item','long-checklist','ficha']){
 const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.goto('file://'+process.cwd()+'/.sites-runtime/print-tests/'+scenario+'.html');await page.waitForSelector('html[data-ready=true]');
 results[scenario]=await page.evaluate(()=>({fit:window.fitResult,overflow:[...document.querySelectorAll('[data-generated-pages] [data-fit-box]')].filter(b=>b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1).length,pageSizes:[...document.querySelectorAll('[data-generated-pages]>[data-page]')].map(p=>({width:p.getBoundingClientRect().width,height:p.getBoundingClientRect().height})),ficha:document.querySelector('.ficha-reference #sheet')?.getBoundingClientRect().toJSON()}));
 await page.pdf({path:'.sites-runtime/print-tests/'+scenario+'.pdf',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,scale:1});await page.screenshot({path:'.sites-runtime/print-tests/'+scenario+'.png',fullPage:false});await page.close();
}
await browser.close();fs.writeFileSync('.sites-runtime/print-tests/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
