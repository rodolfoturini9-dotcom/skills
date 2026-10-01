export async function requestClinicalAI(operation,beds,{signal,date,text,image}={}){
 const metadata=await fetch('/api/pep',{cache:'no-store',signal});const snapshot=await metadata.json();if(!metadata.ok)throw Error(snapshot.error||'Falha ao conferir registros.');
 const identities=beds.map(b=>({bedId:b.bedId,patientId:b.patientId,episodeId:b.episodeId}));
 for(const b of beds){const current=snapshot.state.beds[b.bedId];if(!current||current.patientId!==b.patientId||current.episodeId!==b.episodeId||JSON.stringify(current)!==JSON.stringify(b))throw Error('Aguarde o salvamento ou recarregue antes de gerar.');}
 const r=await fetch('/api/pep/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,patients:identities,version:snapshot.version,sourceToken:snapshot.sourceToken,date,text,image}),signal});
 const result=await r.json();if(!r.ok)throw Error(result.error||'Falha ao gerar.');return result;
}
