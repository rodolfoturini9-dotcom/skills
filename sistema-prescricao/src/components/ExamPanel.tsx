import { Autocomplete } from "./Autocomplete";
import type { Exame, ItemExame } from "../types";
import { useExames } from "../hooks/useExames";

interface Props {
  exames: ReturnType<typeof useExames>;
  items: ItemExame[];
  onChange: (items: ItemExame[]) => void;
}

let uidCounter = 0;
function nextUid() {
  uidCounter += 1;
  return `exm_${Date.now()}_${uidCounter}`;
}

export function ExamPanel({ exames, items, onChange }: Props) {
  function addItem(exame: Exame) {
    if (items.some((it) => it.exameId === exame.id)) return;
    const obs = [exame.jejum ? "Jejum" : null, exame.observacao].filter(Boolean).join(" — ");
    const novo: ItemExame = {
      uid: nextUid(),
      exameId: exame.id,
      nome: exame.nome,
      categoria: exame.categoria,
      observacao: obs,
    };
    onChange([...items, novo]);
  }

  function updateItem(uid: string, patch: Partial<ItemExame>) {
    onChange(items.map((it) => (it.uid === uid ? { ...it, ...patch } : it)));
  }

  function removeItem(uid: string) {
    onChange(items.filter((it) => it.uid !== uid));
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Pedido de exames</h3>
      </div>

      {exames.loading && <p className="hint">Carregando base de exames…</p>}
      {exames.error && <p className="error">{exames.error}</p>}
      {!exames.loading && !exames.error && (
        <p className="hint">{exames.count.toLocaleString("pt-BR")} exames disponíveis na base</p>
      )}

      <Autocomplete<Exame>
        placeholder="Buscar exame (laboratorial, imagem, cardiológico…)…"
        disabled={exames.loading}
        onSearch={(q) => exames.search(q, 25)}
        onSelect={addItem}
        getKey={(e) => e.id}
        renderItem={(e) => (
          <div>
            <strong>{e.nome}</strong>
            <div className="muted small">{e.categoria}</div>
          </div>
        )}
      />

      <ul className="item-list">
        {items.map((item, idx) => (
          <li key={item.uid} className="item-card">
            <div className="item-card-head">
              <span className="item-index">{idx + 1}.</span>
              <div>
                <strong>{item.nome}</strong>
                <div className="muted small">{item.categoria}</div>
              </div>
              <div className="item-actions">
                <button type="button" className="danger" onClick={() => removeItem(item.uid)}>
                  Remover
                </button>
              </div>
            </div>
            <label className="field">
              <span>Observação (opcional)</span>
              <input
                type="text"
                value={item.observacao}
                onChange={(e) => updateItem(item.uid, { observacao: e.target.value })}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
