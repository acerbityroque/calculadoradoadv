"use client";
import { useEffect, useState } from "react";

// Cache simples em localStorage (24h) para nao repetir consultas ao BACEN.
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (Date.now() - o.t > 86400000) return null;
    return o.v;
  } catch { return null; }
}
function cacheSet(key, v) {
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch {}
}

async function fetchJson(url, cacheKey) {
  const cached = cacheKey ? cacheGet(cacheKey) : null;
  if (cached) return cached;
  const r = await fetch(url);
  const d = await r.json();
  if (cacheKey && !d.error) cacheSet(cacheKey, d);
  return d;
}

// Taxa media do BACEN. dataRef (yyyy-mm-dd): taxa vigente no mes da contratacao.
export function useBacen(tipo, dataRef) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    let url = `/api/bacen?tipo=${encodeURIComponent(tipo)}`;
    let key = `bacen:${tipo}`;
    if (dataRef) { url += `&data=${encodeURIComponent(dataRef)}`; key += `:${dataRef}`; }
    fetchJson(url, key)
      .then((d) => { if (alive) setState({ loading: false, data: d.error ? null : d, error: d.error || null }); })
      .catch((e) => { if (alive) setState({ loading: false, data: null, error: String(e) }); });
    return () => { alive = false; };
  }, [tipo, dataRef]);
  return state;
}

// Serie historica do periodo: inicio/fim em yyyy-mm-dd. Retorna { serieHistorica: [{data, taxaAnualPct}] }
export function useBacenSerie(tipo, inicio, fim) {
  const [state, setState] = useState({ loading: false, serie: null, error: null });
  useEffect(() => {
    if (!inicio || !fim) { setState({ loading: false, serie: null, error: null }); return; }
    let alive = true;
    setState({ loading: true, serie: null, error: null });
    const url = `/api/bacen?tipo=${encodeURIComponent(tipo)}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
    const key = `bacenserie:${tipo}:${inicio}:${fim}`;
    fetchJson(url, key)
      .then((d) => { if (alive) setState({ loading: false, serie: d.serieHistorica || null, error: d.error || null }); })
      .catch((e) => { if (alive) setState({ loading: false, serie: null, error: String(e) }); });
    return () => { alive = false; };
  }, [tipo, inicio, fim]);
  return state;
}

// Busca generica em cache (usada pela FIPE).
export function fetchCached(url, key) { return fetchJson(url, key); }
