import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../globals.css';
import './index.css';

const root=createRoot(document.getElementById('root'));
if(location.pathname==='/legado'){
 Promise.all([import('../icu/App.tsx'),import('../legacy.css')]).then(([module])=>root.render(<module.default/>));
}else{
 root.render(<React.StrictMode><App initialRoute={location.pathname.replace(/\/$/,'')==='/ficha-uti'?'ficha':'leitos'}/></React.StrictMode>);
}

// Pede armazenamento persistente para o iOS não descartar o localStorage sob pressão de espaço.
navigator.storage?.persist?.().catch(() => {});
