# Sistema de Prescrição — Dr. Rodolfo Galvão Turini

Aplicação web (React + TypeScript + Vite) para emissão de:

- **Receita simples** (medicamentos)
- **Receita de controle especial (C1)** — modelo duas vias (farmácia / paciente)
- **Pedido de exames**
- **Atestado médico**
- **Encaminhamento**

Os documentos são impressos exatamente sobre o papel timbrado do consultório
(imagens em `public/assets/`), com os campos (paciente, data, itens) posicionados
sobre as áreas em branco do modelo original.

## Bases de dados

- `public/data/medicamentos.json` — base padronizada de medicamentos (nome,
  apresentação, princípio ativo, posologias sugeridas por contexto de uso).
- `public/data/exames.json` — base de exames laboratoriais e de imagem,
  organizada por categoria, usada no autocomplete do "Pedido de exames".

Ambas alimentam os campos de autocomplete dos painéis de Medicamentos e Exames.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Como gerar a build de produção

```bash
npm run build
npm run preview
```

## Impressão

Cada aba tem um botão **"Imprimir documento"**, que aciona a impressão do
navegador (`window.print()`) já configurada com o tamanho de página correto
para cada modelo:

- Receita simples / Pedido de exames / Atestado / Encaminhamento: 210mm × 315mm
  (proporção do timbrado em `receituario-simples-bg.png`).
- Receita controle especial C1 (duas vias lado a lado): 297mm × 198mm
  (proporção do timbrado em `receituario-c1-bg.png`).

Os dados do comprador/farmácia no modelo C1 permanecem em branco para
preenchimento manual na farmácia, como no papel original.
