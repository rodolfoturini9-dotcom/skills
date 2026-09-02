import { useMemo, useState } from "react";
import { Tabs } from "./components/Tabs";
import { PatientPanel } from "./components/PatientPanel";
import { MedicationPanel } from "./components/MedicationPanel";
import { ExamPanel } from "./components/ExamPanel";
import { CertificatePanel } from "./components/CertificatePanel";
import { ReferralPanel } from "./components/ReferralPanel";
import { PrintModelA } from "./print/PrintModelA";
import { PrintModelC1 } from "./print/PrintModelC1";
import { useMedicamentos } from "./hooks/useMedicamentos";
import { useExames } from "./hooks/useExames";
import { DOCTOR } from "./lib/doctor";
import type { AtestadoDados, EncaminhamentoDados, ItemExame, ItemPrescrito, Patient, TipoDocumento } from "./types";

const PAGE_SIZE_A = "210mm 315mm";
const PAGE_SIZE_C1 = "297mm 198mm";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDataBR(iso: string) {
  if (!iso) return "___/___/______";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function App() {
  const medicamentosHook = useMedicamentos();
  const examesHook = useExames();

  const [tipo, setTipo] = useState<TipoDocumento>("receita_simples");
  const [paciente, setPaciente] = useState<Patient>({ nome: "" });
  const [data, setData] = useState<string>(todayISO());

  const [itensMedicamentos, setItensMedicamentos] = useState<ItemPrescrito[]>([]);
  const [itensExames, setItensExames] = useState<ItemExame[]>([]);
  const [atestado, setAtestado] = useState<AtestadoDados>({ dias: "", cid: "", texto: "" });
  const [encaminhamento, setEncaminhamento] = useState<EncaminhamentoDados>({
    especialidade: "",
    motivo: "",
    texto: "",
  });

  const dataFormatada = useMemo(() => formatDataBR(data), [data]);

  const pageSize = tipo === "receita_c1" ? PAGE_SIZE_C1 : PAGE_SIZE_A;

  function handlePrint() {
    window.print();
  }

  function renderPrintTemplate() {
    if (tipo === "receita_c1") {
      return (
        <PrintModelC1
          doctor={DOCTOR}
          paciente={paciente}
          dataFormatada={dataFormatada}
          medicamentos={itensMedicamentos}
        />
      );
    }
    return (
      <PrintModelA
        tipo={tipo}
        doctor={DOCTOR}
        paciente={paciente}
        dataFormatada={dataFormatada}
        medicamentos={itensMedicamentos}
        exames={itensExames}
        atestado={atestado}
        encaminhamento={encaminhamento}
      />
    );
  }

  return (
    <div className="app-root">
      <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>

      <div className="app-shell">
        <header className="app-header">
          <div>
            <h1>Sistema de Prescrição</h1>
            <p className="muted">
              {DOCTOR.nome} · {DOCTOR.crm}
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={handlePrint}>
            Imprimir documento
          </button>
        </header>

        <Tabs value={tipo} onChange={setTipo} />

        <div className="app-body">
          <div className="app-column">
            <PatientPanel paciente={paciente} onChange={setPaciente} data={data} onChangeData={setData} />

            {tipo === "receita_simples" && (
              <MedicationPanel medicamentos={medicamentosHook} items={itensMedicamentos} onChange={setItensMedicamentos} />
            )}
            {tipo === "receita_c1" && (
              <MedicationPanel medicamentos={medicamentosHook} items={itensMedicamentos} onChange={setItensMedicamentos} />
            )}
            {tipo === "pedido_exames" && (
              <ExamPanel exames={examesHook} items={itensExames} onChange={setItensExames} />
            )}
            {tipo === "atestado" && <CertificatePanel dados={atestado} onChange={setAtestado} />}
            {tipo === "encaminhamento" && <ReferralPanel dados={encaminhamento} onChange={setEncaminhamento} />}
          </div>

          <div className="app-column app-preview-column">
            <h3>Pré-visualização de impressão</h3>
            <div className={"preview-frame " + (tipo === "receita_c1" ? "preview-c1" : "preview-a")}>
              <div className="preview-scale">{renderPrintTemplate()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="print-only">{renderPrintTemplate()}</div>
    </div>
  );
}
