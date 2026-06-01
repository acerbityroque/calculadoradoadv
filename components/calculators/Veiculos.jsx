"use client";
import { useEffect, useState } from "react";
import { parseNum, annualToMonthly, revisional, formatBRL } from "@/lib/finance";
import { Field, KPI, money, pct, Disclaimer, ExportButton } from "@/components/ui";
import { useBacen } from "@/components/useBacen";
import { useFator } from "@/components/Settings";

function useFipeList(endpoint, enabled) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !endpoint) { setList([]); return; }
    let alive = true; setLoading(true);
    fetch(`/api/fipe?endpoint=${encodeURIComponent(endpoint)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setList(Array.isArray(d) ? d : (d && Array.isArray(d.modelos) ? d.modelos : [])); })
      .catch(() => { if (alive) setList([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [endpoint, enabled]);
  return { list, loading };
}

export default function Veiculos() {
  const [tipo, setTipo] = useState("carros");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [fipe, setFipe] = useState(null);

  const marcas = useFipeList(`${tipo}/marcas`, true);
  const modelos = useFipeList(marca ? `${tipo}/marcas/${marca}/modelos` : "", !!marca);
  const anos = useFipeList(marca && modelo ? `${tipo}/marcas/${marca}/modelos/${modelo}/anos` : "", !!(marca && modelo));

  useEffect(() => {
    setFipe(null);
    if (!(marca && modelo && ano)) return;
    let alive = true;
    fetch(`/api/fipe?endpoint=${encodeURIComponent(`${tipo}/marcas/${marca}/modelos/${modelo}/anos/${ano}`)}`)
      .then((r) => r.json())
      .then((d) => { if (alive && d && d.Valor) setFipe(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [tipo, marca, modelo, ano]);

  // financiamento
  const [pv, setPv] = useState("");
  const [parc, setParc] = useState("");
  const [n, setN] = useState("");
  const [dataIni, setDataIni] = useState("");
  const bacen = useBacen("veiculos", dataIni || undefined);
  const [manual, setManual] = useState("");
  const [fipeManual, setFipeManual] = useState(""); // valor FIPE na data do contrato (override)
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const { fator } = useFator();

  const modelosList = modelos.list; // hook ja normaliza {modelos:[...]}

  function fipeValorNum() {
    const m = parseNum(fipeManual);
    if (isFinite(m) && m > 0) return m;       // prioridade: valor informado p/ a data do contrato
    if (!fipe || !fipe.Valor) return null;
    return parseNum(fipe.Valor); // "R$ 45.000,00" (valor atual)
  }

  function calc() {
    setErr("");
    const PV = parseNum(pv), PMT = parseNum(parc), N = parseInt(n, 10);
    if (!(PV > 0) || !(PMT > 0) || !(N > 0)) { setErr("Informe valor financiado, valor da parcela e número de parcelas."); setRes(null); return; }
    let avgM = null;
    const man = parseNum(manual);
    if (isFinite(man) && man > 0) avgM = man / 100;
    else if (bacen.data) avgM = annualToMonthly(bacen.data.taxaAnualPct / 100);
    const r = revisional(PV, PMT, N, avgM, fator);
    if (!r) { setErr("Não foi possível calcular a taxa com esses dados."); setRes(null); return; }
    const fv = fipeValorNum();
    r.fipe = fv;
    r.razaoFinFipe = fv ? PV / fv : null; // financiado / valor do bem
    setRes(r);
  }

  return (
    <>
      <div className="card">
        <h3>Tabela FIPE — Veículo financiado</h3>
        <p className="hint">Selecione o veículo para obter o valor FIPE (busca automática do valor atual). Para o valor na data do contrato, use o campo "Valor FIPE na data do contrato" abaixo.</p>
        <div className="grid">
          <Field label="Tipo">
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setMarca(""); setModelo(""); setAno(""); }}>
              <option value="carros">Carros</option>
              <option value="motos">Motos</option>
              <option value="caminhoes">Caminhões</option>
            </select>
          </Field>
          <Field label={marcas.loading ? "Marca (carregando…)" : "Marca"}>
            <select value={marca} onChange={(e) => { setMarca(e.target.value); setModelo(""); setAno(""); }}>
              <option value="">Selecione…</option>
              {marcas.list.map((m) => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
            </select>
          </Field>
          <Field label={modelos.loading ? "Modelo (carregando…)" : "Modelo"}>
            <select value={modelo} onChange={(e) => { setModelo(e.target.value); setAno(""); }} disabled={!marca}>
              <option value="">Selecione…</option>
              {(modelosList || []).map((m) => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
            </select>
          </Field>
          <Field label={anos.loading ? "Ano (carregando…)" : "Ano / combustível"}>
            <select value={ano} onChange={(e) => setAno(e.target.value)} disabled={!modelo}>
              <option value="">Selecione…</option>
              {anos.list.map((a) => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
            </select>
          </Field>
        </div>
        {fipe && fipe.Valor && (
          <div className="kpis" style={{ marginTop: 6 }}>
            <KPI big label={`Valor FIPE atual — ${fipe.Modelo || ""}`} value={fipe.Valor} />
            <KPI label="Referência" value={fipe.MesReferencia || "—"} />
          </div>
        )}
      </div>

      <div className="card">
        <h3>Dados do Financiamento</h3>
        <p className="hint">Apura a taxa real do financiamento e compara com a média BACEN para aquisição de veículos vigente na data da contratação.</p>
        <div className="grid">
          <Field label="Valor financiado (R$)"><input inputMode="decimal" placeholder="45.000,00" value={pv} onChange={(e) => setPv(e.target.value)} /></Field>
          <Field label="Valor da parcela (R$)"><input inputMode="decimal" placeholder="1.250,00" value={parc} onChange={(e) => setParc(e.target.value)} /></Field>
          <Field label="Número de parcelas"><input inputMode="numeric" placeholder="60" value={n} onChange={(e) => setN(e.target.value)} /></Field>
          <Field label="Valor FIPE na data do contrato (R$)" help="Opcional. Se preenchido, usa este valor (histórico) no lugar do valor FIPE atual."><input inputMode="decimal" placeholder="ex.: 38.500,00" value={fipeManual} onChange={(e) => setFipeManual(e.target.value)} /></Field>
          <Field label="Data de início do contrato" help="Define a taxa média de mercado vigente na contratação (critério STJ). Vazio = taxa mais recente."><input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></Field>
          <Field label="Taxa média BACEN — sobrescrever (% a.m.)" help={bacen.loading ? "Buscando…" : bacen.data ? `BACEN ${bacen.data.data}: ${bacen.data.taxaAnualPct.toLocaleString("pt-BR")}% a.a.` : "BACEN indisponível — informe manualmente"}><input inputMode="decimal" placeholder="vazio = BACEN" value={manual} onChange={(e) => setManual(e.target.value)} /></Field>
        </div>
        <div className="btn-row"><button className="btn" onClick={calc}>Calcular</button></div>
        {err && <div className="alert err">{err}</div>}
      </div>

      {res && (
        <div className="card result">
          <ExportButton />
          <h3>Resultado da Análise — Revisional de Automóvel</h3>
          <div className="kpis">
            <KPI big label="Taxa do contrato (a.m.)" value={pct(res.iContractMonthly * 100)} />
            <KPI label="Taxa do contrato (a.a.)" value={pct(res.iContractAnnual * 100)} />
            {res.avgMonthly != null && <KPI label="Média BACEN (a.m.)" value={pct(res.avgMonthly * 100)} />}
            <KPI label="Custo total do crédito" value={money(res.custoTotalCredito)} />
          </div>
          {res.avgMonthly != null && (
            <div className="kpis" style={{ marginTop: 12 }}>
              <KPI label="Parcela na taxa média" value={money(res.pmtFair)} />
              <KPI label="Cobrado a maior / mês" value={money(res.diffMensal)} />
              <KPI big label="Cobrado a maior (total)" value={money(res.diffTotal)} />
            </div>
          )}
          {res.fipe != null && (
            <div className="alert warn">
              Valor financiado equivale a {pct(res.razaoFinFipe * 100, 0)} do valor FIPE do bem ({formatBRL(res.fipe)}).
              {res.razaoFinFipe > 1 ? " Financiamento acima do valor de mercado — verifique tarifas e venda casada (seguros/serviços embutidos)." : " Dentro do valor de mercado."}
            </div>
          )}
          {res.avgMonthly != null && (res.abusivo
            ? <span className="badge red">Taxa &gt; {fator.toLocaleString("pt-BR")}× a média de mercado — indício de abusividade</span>
            : <span className="badge green">Taxa dentro de {fator.toLocaleString("pt-BR")}× a média de mercado</span>)}
          <Disclaimer />
        </div>
      )}
    </>
  );
}
