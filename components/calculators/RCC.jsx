"use client";
import { useState } from "react";
import { parseNum, solveMonthlyRate, annualToMonthly, revisional } from "@/lib/finance";
import { Field, KPI, money, pct, Disclaimer, ExportButton } from "@/components/ui";
import { useBacen } from "@/components/useBacen";
import { useFator } from "@/components/Settings";

// RCC = Reserva de Cartao de Credito (cartao beneficio / consignado de beneficio).
// Mesma logica da RMC, sobre a margem de 5% do cartao beneficio.
export default function RCC() {
  const [saque, setSaque] = useState("");
  const [desc, setDesc] = useState("");
  const [meses, setMeses] = useState("");
  const [dataIni, setDataIni] = useState("");
  const bacen = useBacen("consignadoINSS", dataIni || undefined);
  const [manual, setManual] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const { fator } = useFator();

  function calc() {
    setErr("");
    const PV = parseNum(saque), PMT = parseNum(desc), N = parseInt(meses, 10);
    if (!(PV > 0) || !(PMT > 0) || !(N > 0)) { setErr("Informe valor sacado, desconto mensal e meses descontados."); setRes(null); return; }
    let avgM = null;
    const man = parseNum(manual);
    if (isFinite(man) && man > 0) avgM = man / 100;
    else if (bacen.data) avgM = annualToMonthly(bacen.data.taxaAnualPct / 100);
    const r = revisional(PV, PMT, N, avgM, fator);
    if (!r) { setErr(""); setRes({ naoAmortiza: true, totalPago: PMT * N, PV }); return; }
    setRes(r);
  }

  return (
    <>
      <div className="card">
        <h3>RCC — Reserva de Cartão de Crédito (cartão benefício)</h3>
        <p className="hint">Reserva sobre a margem do cartão benefício. Apura a taxa real e o total descontado, no mesmo critério da RMC.</p>
        <div className="grid">
          <Field label="Valor sacado / liberado (R$)"><input inputMode="decimal" placeholder="800,00" value={saque} onChange={(e) => setSaque(e.target.value)} /></Field>
          <Field label="Desconto mensal (R$)"><input inputMode="decimal" placeholder="40,00" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Meses já descontados"><input inputMode="numeric" placeholder="36" value={meses} onChange={(e) => setMeses(e.target.value)} /></Field>
        <Field label="Data de início do contrato" help="Define a taxa média de mercado vigente na contratação (critério STJ). Vazio = taxa mais recente."><input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></Field>
          <Field label="Taxa média BACEN — sobrescrever (% a.m.)" help={bacen.loading ? "Buscando…" : bacen.data ? `BACEN ${bacen.data.data}: ${bacen.data.taxaAnualPct.toLocaleString("pt-BR")}% a.a.` : "BACEN indisponível — informe manualmente"}><input inputMode="decimal" placeholder="vazio = BACEN" value={manual} onChange={(e) => setManual(e.target.value)} /></Field>
        </div>
        <div className="btn-row"><button className="btn" onClick={calc}>Calcular</button></div>
        {err && <div className="alert err">{err}</div>}
      </div>

      {res && !res.naoAmortiza && (
        <div className="card result">
          <ExportButton />
          <h3>Resultado da Análise — RCC</h3>
          <div className="kpis">
            <KPI big label="Taxa real (a.m.)" value={pct(res.iContractMonthly * 100)} />
            <KPI label="Taxa real (a.a.)" value={pct(res.iContractAnnual * 100)} />
            <KPI label="Total descontado" value={money(res.totalContract)} />
            <KPI label="Custo do crédito" value={money(res.custoTotalCredito)} />
          </div>
          {res.avgMonthly != null && (
            <>
              <div className="kpis" style={{ marginTop: 12 }}>
                <KPI label="Cobrado a maior / mês" value={money(res.diffMensal)} />
                <KPI big label="Cobrado a maior (total)" value={money(res.diffTotal)} />
              </div>
              {res.abusivo
                ? <span className="badge red">Taxa &gt; {fator.toLocaleString("pt-BR")}× a média — indício de abusividade</span>
                : <span className="badge green">Dentro de {fator.toLocaleString("pt-BR")}× a média de mercado</span>}
            </>
          )}
          <Disclaimer />
        </div>
      )}
      {res && res.naoAmortiza && (
        <div className="card result">
          <ExportButton />
          <h3>Resultado — RCC</h3>
          <span className="badge red">Dívida não amortiza: a parcela mínima não quita o saldo</span>
          <div className="kpis" style={{ marginTop: 12 }}>
            <KPI label="Valor sacado" value={money(res.PV)} />
            <KPI big label="Total já descontado" value={money(res.totalPago)} />
          </div>
          <div className="alert warn">Cartão benefício (RCC) em que o desconto mínimo não reduz o saldo — fundamento para revisão e repetição do indébito.</div>
          <Disclaimer />
        </div>
      )}
    </>
  );
}
