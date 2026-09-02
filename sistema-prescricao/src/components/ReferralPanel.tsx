import type { EncaminhamentoDados } from "../types";

interface Props {
  dados: EncaminhamentoDados;
  onChange: (dados: EncaminhamentoDados) => void;
}

function textoPadrao(especialidade: string, motivo: string) {
  const esp = especialidade.trim() || "___________";
  const motivoTexto = motivo.trim() ? ` Motivo: ${motivo.trim()}.` : "";
  return `Encaminho o(a) paciente acima identificado(a) para avaliação com ${esp}.${motivoTexto}`;
}

export function ReferralPanel({ dados, onChange }: Props) {
  function setEspecialidade(especialidade: string) {
    onChange({ ...dados, especialidade, texto: textoPadrao(especialidade, dados.motivo) });
  }
  function setMotivo(motivo: string) {
    onChange({ ...dados, motivo, texto: textoPadrao(dados.especialidade, motivo) });
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Encaminhamento</h3>
      </div>

      <label className="field">
        <span>Especialidade / serviço</span>
        <input
          type="text"
          value={dados.especialidade}
          onChange={(e) => setEspecialidade(e.target.value)}
          placeholder="Ex.: Cardiologia"
        />
      </label>

      <label className="field">
        <span>Motivo (opcional)</span>
        <input
          type="text"
          value={dados.motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: Investigação de dor torácica"
        />
      </label>

      <label className="field">
        <span>Texto do encaminhamento</span>
        <textarea
          rows={6}
          value={dados.texto}
          onChange={(e) => onChange({ ...dados, texto: e.target.value })}
        />
      </label>
    </div>
  );
}
