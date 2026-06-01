"use client";
import { useState } from "react";
import { parseNum, solveMonthlyRate, monthlyToAnnual, annualToMonthly, revisional } from "@/lib/finance";
import { Field, KPI, money, pct, Disclaimer, ExportButton } from "@/components/ui";
import { useBacen } from "@/components/useBacen";
import { useFator } from "@/components/Settings";

export default function Consignado() {
  const [pv, setPv] = useState("");
  const [parc, setParc] = useState("");
  const [n, setN] = useState("");
  const [tipo, setTipo] = useState("consignadoINSS");
  const [dataIni, setDataIni] = useState("");
  const bacen = useBacen(tipo, dataIni || undefined);
  const [manual, setManual] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const { fator } = useFator();

  function calc() {
    setErr("");
    const PV = parseNum(pv), PMT = parseNum(parc), N = parseInt(n, 10);
    if (!(PV > 0) || !(PMT > 0) || !(N > 0)) { setErr("Preencha valor financiado, parcela e número de parcelas com valores válidos."); setRes(null); return; }
    const i = solveMonthlyRate(PV, PMT, N);
    if (i == null) { setErr("Não foi possível calcular a taxa com esses dados."); setRes(null); return; }
    // taxa media de mercado (mensal)
    let avgM = null;
    const man = parseNum(manual);
    if (isFinite(man) && man > 0) avgM = man / 100; // usuario informou % a.m.
    else if (bacen.data) avgM = annualToMonthly(bacen.data.taxaAnualPct / 100);
    const r = revisional(PV, PMT, N, avgM, fator);
    setRes(r);
  }

  return (
    <>
      <div className="card">
        <h3>Informações do Contrato — Empréstimo Consignado</h3>
        <p className="hint">Apura a taxa de juros real embutida (CET) e compara com a média de mercado do BACEN para evidenciar abusividade.</p>
        <div className="grid">
          <Field label="Valor financiado / liberado (R$)"><input inputMode="decimal" placeholder="5.424,32" value={pv} onChange={(e) => setPv(e.target.value)} /></Field>
          <Field label="Valor da parcela (R$)"><input inputMode="decimal" placeholder="150,00" value={parc} onChange={(e) => setParc(e.target.value)} /></Field>
          <Field label="Número de parcelas"><input inputMode="numeric" placeholder="84" value={n} onChange={(e) => setN(e.target.value)} /></Field>
          <Field label="Modalidade (média BACEN)">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="consignadoINSS">Consignado INSS</option>
              <option value="consignadoPrivado">Consignado privado</option>
              <option value="consignadoPublico">Consignado público</option>
              <option value="consignadoTotal">Consignado total</option>
            </select>
          </Field>
        </div>
        <Field label="Data de início do contrato" help="Define a taxa média de mercado vigente na contratação (critério STJ). Vazio = taxa mais recente."><input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></Field>
        <Field label="Taxa média de mercado — sobrescrever (% a.m., opcional)" help={bacen.loading ? "Buscando taxa no BACEN…" : bacen.data ? `BACEN ${bacen.data.data}: ${bacen.data.taxaAnualPct.toLocaleString("pt-BR")}% a.a.` : bacen.error ? "BACEN indisponível — informe a taxa manualmente." : ""}>
          <input inputMode="decimal" placeholder="deixe vazio p/ usar o BACEN" value={manual} onChange={(e) => setManual(e.target.value)} />
        </Field>
        <div className="btn-row"><button className="btn" onClick={calc}>Calcular</button></div>
        {err && <div className="alert err">{err}</div>}
      </div>

      {res && (
        <div className="card result">
          <ExportButton />
          <h3>Resultado da Análise</h3>
          <div className="kpis">
            <KPI big label="Taxa do contrato (a.m.)" value={pct(res.iContractMonthly * 100)} />
            <KPI label="Taxa do contrato (a.a.)" value={pct(res.iContractAnnual * 100)} />
            {res.avgMonthly != null && <KPI label="Média de mercado (a.m.)" value={pct(res.avgMonthly * 100)} />}
            <KPI label="Custo total do crédito" value={money(res.custoTotalCredito)} />
          </div>
          {res.avgMonthly != null && (
            <>
              <div className="kpis" style={{ marginTop: 12 }}>
                <KPI label="Parcela na taxa média" value={money(res.pmtFair)} />
                <KPI label="Cobrado a maior / mês" value={money(res.diffMensal)} />
                <KPI big label="Cobrado a maior (total)" value={money(res.diffTotal)} />
              </div>
              {res.abusivo
                ? <span className="badge red">Taxa superior a {fator.toLocaleString("pt-BR")}× a média de mercado — forte indício de abusividade (STJ)</span>
                : <span className="badge green">Taxa dentro de {fator.toLocaleString("pt-BR")}× a média de mercado</span>}
            </>
          )}
          <Disclaimer />
        </div>
      )}
    </>
  );
}
