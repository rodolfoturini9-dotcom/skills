import type { AtestadoDados, Doctor, EncaminhamentoDados, ItemExame, ItemPrescrito, Patient, TipoDocumento } from "../types";

interface Props {
  tipo: Extract<TipoDocumento, "receita_simples" | "pedido_exames" | "atestado" | "encaminhamento">;
  doctor: Doctor;
  paciente: Patient;
  dataFormatada: string;
  medicamentos?: ItemPrescrito[];
  exames?: ItemExame[];
  atestado?: AtestadoDados;
  encaminhamento?: EncaminhamentoDados;
}

const TITULOS: Record<Props["tipo"], string> = {
  receita_simples: "RECEITUÁRIO",
  pedido_exames: "PEDIDO DE EXAMES",
  atestado: "ATESTADO MÉDICO",
  encaminhamento: "ENCAMINHAMENTO",
};

export function PrintModelA({ tipo, doctor, paciente, dataFormatada, medicamentos, exames, atestado, encaminhamento }: Props) {
  return (
    <div className="print-page print-model-a">
      <img className="print-bg" src="/assets/receituario-simples-bg.png" alt="" />

      <div className="ov-paciente">{paciente.nome}</div>
      <div className="ov-data">
        {doctor.cidade}, {dataFormatada}
      </div>

      <div className="ov-titulo-a">{TITULOS[tipo]}</div>

      <div className="ov-body-a">
        {tipo === "receita_simples" && (
          <ol className="rx-list">
            {(medicamentos ?? []).map((item, i) => (
              <li key={item.uid ?? i}>
                <div className="rx-list-nome">
                  {item.nome} — {item.apresentacao}
                  {item.quantidade ? ` · ${item.quantidade}` : ""}
                </div>
                {item.posologia && <div className="rx-list-posologia">{item.posologia}</div>}
              </li>
            ))}
            {(!medicamentos || medicamentos.length === 0) && (
              <li className="rx-list-empty">Nenhum medicamento adicionado.</li>
            )}
          </ol>
        )}

        {tipo === "pedido_exames" && (
          <ol className="rx-list">
            {(exames ?? []).map((item, i) => (
              <li key={item.uid ?? i}>
                <div className="rx-list-nome">{item.nome}</div>
                {item.observacao && <div className="rx-list-posologia">{item.observacao}</div>}
              </li>
            ))}
            {(!exames || exames.length === 0) && <li className="rx-list-empty">Nenhum exame adicionado.</li>}
          </ol>
        )}

        {tipo === "atestado" && (
          <div className="rx-texto">
            {atestado?.texto || "—"}
          </div>
        )}

        {tipo === "encaminhamento" && (
          <div className="rx-texto">
            {encaminhamento?.texto || "—"}
          </div>
        )}
      </div>
    </div>
  );
}
