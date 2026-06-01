"use client";
import { useEffect, useState } from "react";

// Busca a taxa media do BACEN para a modalidade informada.
// dataRef (yyyy-mm-dd, opcional): retorna a taxa media vigente NO MES da contratacao
// (referencia juridica correta - STJ). Sem dataRef, usa a taxa mais recente.
export function useBacen(tipo, dataRef) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    let url = `/api/bacen?tipo=${encodeURIComponent(tipo)}`;
    if (dataRef) url += `&data=${encodeURIComponent(dataRef)}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (alive) { if (d.error) setState({ loading: false, data: null, error: d.error }); else setState({ loading: false, data: d, error: null }); } })
      .catch((e) => { if (alive) setState({ loading: false, data: null, error: String(e) }); });
    return () => { alive = false; };
  }, [tipo, dataRef]);
  return state;
}
