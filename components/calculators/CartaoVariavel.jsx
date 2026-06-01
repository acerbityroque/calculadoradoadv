"use client";
import { useState } from "react";
import { parseNum, expandRows, solveIRR, monthlyToAnnual, annualToMonthly, pmtOf } from "@/lib/finance";
import { Field, KPI, money, pct, Disclaimer, ExportButton } from "@/components/ui";
import { useBacen } from "@/components/useBacen";
import { useFator } from "@/components/Settings";
import RowsEditor from "@/components/RowsEditor";

// RMC / RCC com descontos VARIÁVEIS (valor muda ao longo dos meses).
// Usa fluxo de caixa: t0 = valor sacado (entrada), depois cada desconto (saída).
export default function CartaoVariavel({ titulo = "RMC Variável", sub = "Reserva de Margem Consignável — descontos variáveis" }) {
  const [saque, setSaque] = useState("");
  const [rows, setRows] = useState([{ valor: "", meses: "" }]);
  const [dataIni, setDataIni] = useState("");
  const bacen = useBacen("consignadoINSS", dataIni || undefined);
  const [manual, setManual] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const { fator } = useFator();

  function calc() {
    setErr("");
    const PV = parseNum(saque);
    const arr = expandRows(rows);
    if (!(PV > 0) || arr.length === 0) { setErr("Informe o valor sacado e pelo menos um período de desconto."); setRes(null); return; }
    const total = arr.reduce((a, b) => a + b, 0);
    const cfs = [PV, ...arr.map((v) => -v)];
    const i = solveIRR(cfs); // taxa mensal embutida
    let avgM = null;
    const man = parseNum(manual);
    if (isFinite(man) && man > 0) avgM = man / 100;
    else if (bacen.data) avgM = annualToMonthly(bacen.data.taxaAnualPct / 100);
    const naoAmortiza = i == null; // descontos não cobrem o saldo
    // quanto pagaria a mais: total cobrado vs total na taxa média (mesmo nº de meses)
    let totalFair = null, diffTotal = null, diffMensal = null;
    if (avgM != null && avgM > 0) {
      const pmtFair = pmtOf(PV, avgM, arr.length);
      totalFair = pmtFair * arr.length;
      diffTotal = total - totalFair;
      diffMensal = diffTotal / arr.length;
    }
    setRes({
      total, meses: arr.length, PV, naoAmortiza,
      iMonthly: i, iAnnual: i != null ? monthlyToAnnual(i) : null,
      avgM, abusivo: i != null && avgM != null ? i > avgM * fator : null,
      custo: total - PV, totalFair, diffTotal, diffMensal,
    });
  }

  return (
    <>
      <div className="card">
        <h3>{titulo}</h3>
        <p className="hint">{sub}. Use quando o desconto mensal mudou ao longo do tempo (ex.: reajuste do benefício). Informe cada faixa de valor e por quantos meses vigorou.</p>
        <div className="grid">
          <Field label="Valor sacado / liberado (R$)"><input inputMode="decimal" placeholder="1.000,00" value={saque} onChange={(e) => setSaque(e.target.value)} /></Field>
          <Field label="Data de início do contrato" help="Define a taxa média de mercado vigente na contratação (critério STJ). Vazio = taxa mais recente."><input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></Field>
          <Field label="Taxa média BACEN — sobrescrever (% a.m.)" help={bacen.loading ? "Buscando…" : bacen.data ? `BACEN ${bacen.data.data}: ${bacen.data.taxaAnualPct.toLocaleString("pt-BR")}% a.a.` : "BACEN indisponível — informe manualmente"}><input inputMode="decimal" placeholder="vazio = BACEN" value={manual} onChange={(e) => setManual(e.target.value)} /></Field>
        </div>
        <Field label="Descontos mensais (por período)"><RowsEditor rows={rows} setRows={setRows} valorLabel="Desconto mensal (R$)" /></Field>
        <div className="btn-row"><button className="btn" onClick={calc}>Calcular</button></div>
        {err && <div className="alert err">{err}</div>}
      </div>

      {res && (
        <div className="card result">
          <ExportButton />
          <h3>Resultado — {titulo}</h3>
          <div className="kpis">
            <KPI label="Valor sacado" value={money(res.PV)} />
            <KPI label="Meses descontados" value={res.meses} />
            <KPI big label="Total descontado" value={money(res.total)} />
            <KPI label="Custo do crédito" value={money(res.custo)} />
          </div>
          {!res.naoAmortiza ? (
            <>
              <div className="kpis" style={{ marginTop: 12 }}>
                <KPI big label="Taxa real (a.m.)" value={pct(res.iMonthly * 100)} />
                <KPI label="Taxa real (a.a.)" value={pct(res.iAnnual * 100)} />
                {res.avgM != null && <KPI label="Média BACEN (a.m.)" value={pct(res.avgM * 100)} />}
              </div>
              {res.diffTotal != null && (
                <div className="kpis" style={{ marginTop: 12 }}>
                  <KPI label="Pago a mais / mês (médio)" value={money(res.diffMensal)} />
                  <KPI big label="Pago a mais (total)" value={money(res.diffTotal)} />
                </div>
              )}
              {res.abusivo === true && <span className="badge red">Taxa &gt; {fator.toLocaleString("pt-BR")}× a média — indício de abusividade</span>}
              {res.abusivo === false && <span className="badge green">Dentro de {fator.toLocaleString("pt-BR")}× a média de mercado</span>}
            </>
          ) : (
            <div style={{ marginTop: 12 }}>
              <span className="badge red">Dívida não amortiza</span>
              <div className="alert warn">Mesmo após {res.meses} meses, os descontos não quitam o saldo — situação clássica de cartão consignado (RMC/RCC) abusivo, com fundamento para revisão e repetição do indébito.</div>
            </div>
          )}
          <Disclaimer />
        </div>
      )}
    </>
  );
}
