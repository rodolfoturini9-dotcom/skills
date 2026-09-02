import type { TipoDocumento } from "../types";

const TABS: { value: TipoDocumento; label: string }[] = [
  { value: "receita_simples", label: "Receita simples" },
  { value: "receita_c1", label: "Receita controle especial (C1)" },
  { value: "pedido_exames", label: "Pedido de exames" },
  { value: "atestado", label: "Atestado" },
  { value: "encaminhamento", label: "Encaminhamento" },
];

interface Props {
  value: TipoDocumento;
  onChange: (value: TipoDocumento) => void;
}

export function Tabs({ value, onChange }: Props) {
  return (
    <div className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={"tab" + (tab.value === value ? " active" : "")}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
