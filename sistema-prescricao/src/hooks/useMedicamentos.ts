import { useEffect, useMemo, useRef, useState } from "react";
import type { ContextoUso, MedicamentoBase, MedicamentoIndexItem } from "../types";
import { normalize } from "../lib/search";

interface RawFile {
  versao: string;
  total: number;
  medicamentos: MedicamentoBase[];
}

interface State {
  loading: boolean;
  error: string | null;
  count: number;
}

export function useMedicamentos() {
  const [state, setState] = useState<State>({ loading: true, error: null, count: 0 });
  const byIdRef = useRef<Map<string, MedicamentoBase>>(new Map());
  const indexRef = useRef<MedicamentoIndexItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/medicamentos.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Falha ao carregar base de medicamentos (${res.status})`);
        return res.json() as Promise<RawFile>;
      })
      .then((data) => {
        if (cancelled) return;
        const byId = byIdRef.current;
        const index: MedicamentoIndexItem[] = [];
        for (const m of data.medicamentos) {
          byId.set(m.id, m);
          index.push({
            id: m.id,
            nome: m.nome,
            apresentacao: m.apresentacao,
            principio_ativo: m.principio_ativo,
            tipo_nome: m.tipo_nome,
            search: normalize(`${m.nome} ${m.apresentacao} ${m.principio_ativo}`),
          });
        }
        indexRef.current = index;
        setState({ loading: false, error: null, count: index.length });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ loading: false, error: err.message, count: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function search(query: string, limit = 30): MedicamentoIndexItem[] {
    const q = normalize(query);
    if (!q) return [];
    const results: MedicamentoIndexItem[] = [];
    for (const item of indexRef.current) {
      if (item.search.includes(q)) {
        results.push(item);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  function getById(id: string): MedicamentoBase | undefined {
    return byIdRef.current.get(id);
  }

  function getPosologias(id: string, contexto: ContextoUso) {
    const med = byIdRef.current.get(id);
    return med?.opcoes?.[contexto] ?? [];
  }

  return useMemo(
    () => ({ ...state, search, getById, getPosologias }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.loading, state.error, state.count]
  );
}
