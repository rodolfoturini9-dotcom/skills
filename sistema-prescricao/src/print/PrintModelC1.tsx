import type { Doctor, ItemPrescrito, Patient } from "../types";

interface Props {
  doctor: Doctor;
  paciente: Patient;
  dataFormatada: string;
  medicamentos: ItemPrescrito[];
}

function Half({ side, doctor, paciente, dataFormatada, medicamentos }: Props & { side: "esquerda" | "direita" }) {
  const cls = side === "esquerda" ? "c1-half c1-half-left" : "c1-half c1-half-right";
  return (
    <div className={cls}>
      <div className="ov-paciente-c1">{paciente.nome}</div>
      <div className="ov-data-c1">
        {doctor.cidade}, {dataFormatada}
      </div>
      <div className="ov-rx-c1">
        <ol className="rx-list rx-list-c1">
          {medicamentos.map((item, i) => (
            <li key={item.uid ?? i}>
              <div className="rx-list-nome">
                {item.nome} — {item.apresentacao}
                {item.quantidade ? ` · ${item.quantidade}` : ""}
              </div>
              {item.posologia && <div className="rx-list-posologia">{item.posologia}</div>}
            </li>
          ))}
          {medicamentos.length === 0 && <li className="rx-list-empty">Nenhum medicamento adicionado.</li>}
        </ol>
      </div>
    </div>
  );
}

export function PrintModelC1(props: Props) {
  return (
    <div className="print-page print-model-c1">
      <img className="print-bg" src="/assets/receituario-c1-bg.png" alt="" />
      <Half {...props} side="esquerda" />
      <Half {...props} side="direita" />
    </div>
  );
}
