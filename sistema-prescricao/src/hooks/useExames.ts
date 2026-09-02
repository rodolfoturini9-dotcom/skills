import { useEffect, useRef, useState } from "react";
import type { Exame } from "../types";
import { normalize } from "../lib/search";

interface RawFile {
  versao: string;
  total: number;
  exames: Exame[];
}

interface IndexedExame extends Exame {
  search: string;
}

interface State {
  loading: boolean;
  error: string | null;
  count: number;
}

export function useExames() {
  const [state, setState] = useState<State>({ loading: true, error: null, count: 0 });
  const indexRef = useRef<IndexedExame[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/exames.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Falha ao carregar base de exames (${res.status})`);
        return res.json() as Promise<RawFile>;
      })
      .then((data) => {
        if (cancelled) return;
        indexRef.current = data.exames.map((e) => ({
          ...e,
          search: normalize(`${e.nome} ${e.categoria}`),
        }));
        setState({ loading: false, error: null, count: data.exames.length });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ loading: false, error: err.message, count: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function search(query: string, limit = 30): Exame[] {
    const q = normalize(query);
    if (!q) return [];
    const results: Exame[] = [];
    for (const item of indexRef.current) {
      if (item.search.includes(q)) {
        results.push(item);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  function all(): Exame[] {
    return indexRef.current;
  }

  return { ...state, search, all };
}
