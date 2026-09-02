import { useState } from "react";
import { Autocomplete } from "./Autocomplete";
import type { ContextoUso, ItemPrescrito, MedicamentoIndexItem } from "../types";
import { useMedicamentos } from "../hooks/useMedicamentos";

interface Props {
  medicamentos: ReturnType<typeof useMedicamentos>;
  items: ItemPrescrito[];
  onChange: (items: ItemPrescrito[]) => void;
}

const CONTEXTOS: { value: ContextoUso; label: string }[] = [
  { value: "ambulatorial_adulto", label: "Ambulatorial — adulto" },
  { value: "ambulatorial_pediatria", label: "Ambulatorial — pediatria" },
  { value: "hospitalar_adulto", label: "Hospitalar — adulto" },
  { value: "hospitalar_pediatria", label: "Hospitalar — pediatria" },
];

let uidCounter = 0;
function nextUid() {
  uidCounter += 1;
  return `med_${Date.now()}_${uidCounter}`;
}

export function MedicationPanel({ medicamentos, items, onChange }: Props) {
  const [contexto, setContexto] = useState<ContextoUso>("ambulatorial_adulto");

  function addItem(med: MedicamentoIndexItem) {
    const sugestoes = medicamentos.getPosologias(med.id, contexto);
    const novo: ItemPrescrito = {
      uid: nextUid(),
      medicamentoId: med.id,
      nome: med.nome,
      apresentacao: med.apresentacao,
      quantidade: "1 caixa",
      posologia: sugestoes[0]?.text ?? "",
    };
    onChange([...items, novo]);
  }

  function updateItem(uid: string, patch: Partial<ItemPrescrito>) {
    onChange(items.map((it) => (it.uid === uid ? { ...it, ...patch } : it)));
  }

  function removeItem(uid: string) {
    onChange(items.filter((it) => it.uid !== uid));
  }

  function move(uid: string, dir: -1 | 1) {
    const idx = items.findIndex((it) => it.uid === uid);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
    onChange(copy);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Medicamentos</h3>
        <select
          className="contexto-select"
          value={contexto}
          onChange={(e) => setContexto(e.target.value as ContextoUso)}
        >
          {CONTEXTOS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {medicamentos.loading && <p className="hint">Carregando base de medicamentos…</p>}
      {medicamentos.error && <p className="error">{medicamentos.error}</p>}
      {!medicamentos.loading && !medicamentos.error && (
        <p className="hint">{medicamentos.count.toLocaleString("pt-BR")} itens disponíveis na base</p>
      )}

      <Autocomplete<MedicamentoIndexItem>
        placeholder="Buscar medicamento (nome, princípio ativo ou apresentação)…"
        disabled={medicamentos.loading}
        onSearch={(q) => medicamentos.search(q, 25)}
        onSelect={addItem}
        getKey={(m) => m.id}
        renderItem={(m) => (
          <div>
            <strong>{m.nome}</strong>
            <span className="muted"> — {m.apresentacao}</span>
            <div className="muted small">{m.principio_ativo}</div>
          </div>
        )}
      />

      <ul className="item-list">
        {items.map((item, idx) => {
          const sugestoes = medicamentos.getPosologias(item.medicamentoId, contexto);
          return (
            <li key={item.uid} className="item-card">
              <div className="item-card-head">
                <span className="item-index">{idx + 1}.</span>
                <div>
                  <strong>{item.nome}</strong>
                  <div className="muted small">{item.apresentacao}</div>
                </div>
                <div className="item-actions">
                  <button type="button" onClick={() => move(item.uid, -1)} title="Mover para cima">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(item.uid, 1)} title="Mover para baixo">
                    ↓
                  </button>
                  <button type="button" className="danger" onClick={() => removeItem(item.uid)}>
                    Remover
                  </button>
                </div>
              </div>

              <label className="field">
                <span>Quantidade</span>
                <input
                  type="text"
                  value={item.quantidade}
                  onChange={(e) => updateItem(item.uid, { quantidade: e.target.value })}
                />
              </label>

              {sugestoes.length > 0 && (
                <label className="field">
                  <span>Posologia sugerida</span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) updateItem(item.uid, { posologia: e.target.value });
                    }}
                  >
                    <option value="">Selecionar sugestão…</option>
                    {sugestoes.map((s) => (
                      <option key={s.id} value={s.text}>
                        {s.label} ({s.source})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field">
                <span>Posologia (texto que sai na receita)</span>
                <textarea
                  rows={2}
                  value={item.posologia}
                  onChange={(e) => updateItem(item.uid, { posologia: e.target.value })}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
