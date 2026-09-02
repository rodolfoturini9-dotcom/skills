import type { AtestadoDados } from "../types";

interface Props {
  dados: AtestadoDados;
  onChange: (dados: AtestadoDados) => void;
}

function textoPadrao(dias: string, cid: string) {
  const diasNum = dias.trim() || "___";
  const cidTexto = cid.trim() ? ` (CID-10: ${cid.trim()})` : "";
  return `Atesto para os devidos fins que o(a) paciente acima identificado(a) esteve sob meus cuidados médicos e necessita de ${diasNum} dia(s) de afastamento de suas atividades laborais/escolares a partir desta data${cidTexto}.`;
}

export function CertificatePanel({ dados, onChange }: Props) {
  function setDias(dias: string) {
    onChange({ ...dados, dias, texto: textoPadrao(dias, dados.cid) });
  }
  function setCid(cid: string) {
    onChange({ ...dados, cid, texto: textoPadrao(dados.dias, cid) });
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Atestado médico</h3>
      </div>

      <label className="field">
        <span>Dias de afastamento</span>
        <input type="text" value={dados.dias} onChange={(e) => setDias(e.target.value)} placeholder="Ex.: 3" />
      </label>

      <label className="field">
        <span>CID-10 (opcional)</span>
        <input type="text" value={dados.cid} onChange={(e) => setCid(e.target.value)} placeholder="Ex.: J06.9" />
      </label>

      <label className="field">
        <span>Texto do atestado</span>
        <textarea
          rows={6}
          value={dados.texto}
          onChange={(e) => onChange({ ...dados, texto: e.target.value })}
        />
      </label>
    </div>
  );
}
