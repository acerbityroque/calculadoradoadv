"use client";
import { useState } from "react";
import { parseNum, solveMonthlyRate, monthlyToAnnual, annualToMonthly, revisional } from "@/lib/finance";
import { Field, KPI, money, pct, Disclaimer, ExportButton } from "@/components/ui";
import { useBacen } from "@/components/useBacen";
import { useFator } from "@/components/Settings";

// RMC = Reserva de Margem Consignavel (cartao de credito consignado).
// O banco reserva ~5% da margem e o cliente recebe um saque, pagando uma
// "parcela minima" fixa que muitas vezes nunca quita a divida.
export default function RMC() {
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
    if (!(PV > 0) || !(PMT > 0) || !(N > 0)) { setErr("Informe o valor sacado, o desconto mensal e a quantidade de meses descontados."); setRes(null); return; }
    const i = solveMonthlyRate(PV, PMT, N);
    let avgM = null;
    const man = parseNum(manual);
    if (isFinite(man) && man > 0) avgM = man / 100;
    else if (bacen.data) avgM = annualToMonthly(bacen.data.taxaAnualPct / 100);
    const r = revisional(PV, PMT, N, avgM, fator);
    if (!r) { setErr("Com esses valores a dívida não se amortiza (parcela cobre apenas juros) — típico de RMC abusiva. Informe um prazo maior ou reveja os dados."); setRes({ naoAmortiza: true, totalPago: PMT * N, PV }); return; }
    setRes(r);
  }

  return (
    <>
      <div className="card">
        <h3>RMC — Reserva de Margem Consignável</h3>
        <p className="hint">Cartão de crédito consignado contratado como empréstimo. Apura a taxa real embutida no saque e o total descontado do benefício.</p>
        <div className="grid">
          <Field label="Valor sacado / liberado (R$)"><input inputMode="decimal" placeholder="1.000,00" value={saque} onChange={(e) => setSaque(e.target.value)} /></Field>
          <Field label="Desconto mensal na margem (R$)" help="≈ 5% do benefício, valor fixo descontado"><input inputMode="decimal" placeholder="50,00" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
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
          <h3>Resultado da Análise — RMC</h3>
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
          <h3>Resultado — RMC</h3>
          <span className="badge red">Dívida não amortiza: a parcela mínima não quita o saldo</span>
          <div className="kpis" style={{ marginTop: 12 }}>
            <KPI label="Valor sacado" value={money(res.PV)} />
            <KPI big label="Total já descontado" value={money(res.totalPago)} />
          </div>
          <div className="alert warn">Situação clássica de cartão consignado (RMC): o cliente paga indefinidamente e o saldo não cai. Forte fundamento para revisão / reenquadramento como empréstimo consignado.</div>
          <Disclaimer />
        </div>
      )}
    </>
  );
}
