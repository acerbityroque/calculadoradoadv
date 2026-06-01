"use client";
import { useState } from "react";
import { parseNum, pmtOf, priceSchedule, monthlyToAnnual, annualToMonthly } from "@/lib/finance";
import { Field, KPI, money, pct, Disclaimer, ExportButton } from "@/components/ui";
import { useBacen } from "@/components/useBacen";
import { useFator } from "@/components/Settings";

// Empréstimo Quitado: a partir da taxa informada no contrato, reconstrói a
// tabela Price, mostra total pago, juros e compara com a média de mercado.
export default function EmprestimoQuitado() {
  const [tipo, setTipo] = useState("");
  const [numero, setNumero] = useState("");
  const [tel, setTel] = useState("");
  const [taxa, setTaxa] = useState("");   // % a.m. informada no contrato
  const [pv, setPv] = useState("");
  const [n, setN] = useState("");
  const [dataIni, setDataIni] = useState("");
  const bacen = useBacen("consignadoINSS", dataIni || undefined);
  const [manual, setManual] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const { fator } = useFator();

  function calc() {
    setErr("");
    const PV = parseNum(pv), im = parseNum(taxa) / 100, N = parseInt(n, 10);
    if (!(PV > 0) || !(im > 0) || !(N > 0)) { setErr("Informe valor financiado, taxa de juros mensal e número de parcelas."); setRes(null); return; }
    const { pmt, rows } = priceSchedule(PV, im, N);
    const totalPago = pmt * N;
    let avgM = null;
    const man = parseNum(manual);
    if (isFinite(man) && man > 0) avgM = man / 100;
    else if (bacen.data) avgM = annualToMonthly(bacen.data.taxaAnualPct / 100);
    let pmtFair = null, totalFair = null, diffMensal = null, diffTotal = null, abusivo = null;
    if (avgM) {
      pmtFair = pmtOf(PV, avgM, N);
      totalFair = pmtFair * N;
      diffMensal = pmt - pmtFair;
      diffTotal = totalPago - totalFair;
      abusivo = im > avgM * fator;
    }
    setRes({ tipo, numero, tel, pmt, rows, totalPago, im, iAnnual: monthlyToAnnual(im), juros: totalPago - PV, PV, N, avgM, pmtFair, totalFair, diffMensal, diffTotal, abusivo });
  }

  return (
    <>
      <div className="card">
        <h3>Empréstimo Quitado — relatório do contrato</h3>
        <p className="hint">Reconstrói a tabela Price a partir da taxa informada no contrato. Útil para emitir um demonstrativo do que foi efetivamente pago.</p>
        <div className="grid">
          <Field label="Tipo de contrato"><input placeholder="Consignado INSS" value={tipo} onChange={(e) => setTipo(e.target.value)} /></Field>
          <Field label="Número do contrato"><input placeholder="331641709" value={numero} onChange={(e) => setNumero(e.target.value)} /></Field>
          <Field label="Telefone (opcional)"><input placeholder="(85) ..." value={tel} onChange={(e) => setTel(e.target.value)} /></Field>
          <Field label="Taxa de juros mensal (% a.m.)"><input inputMode="decimal" placeholder="2,12" value={taxa} onChange={(e) => setTaxa(e.target.value)} /></Field>
          <Field label="Valor financiado (R$)"><input inputMode="decimal" placeholder="449,43" value={pv} onChange={(e) => setPv(e.target.value)} /></Field>
          <Field label="Número total de parcelas"><input inputMode="numeric" placeholder="72" value={n} onChange={(e) => setN(e.target.value)} /></Field>
        </div>
        <Field label="Data de início do contrato" help="Define a taxa média de mercado vigente na contratação (critério STJ). Vazio = taxa mais recente."><input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></Field>
        <Field label="Taxa média BACEN — sobrescrever (% a.m.)" help={bacen.loading ? "Buscando…" : bacen.data ? `BACEN ${bacen.data.data}: ${bacen.data.taxaAnualPct.toLocaleString("pt-BR")}% a.a.` : "BACEN indisponível — informe manualmente"}><input inputMode="decimal" placeholder="vazio = BACEN" value={manual} onChange={(e) => setManual(e.target.value)} /></Field>
        <div className="btn-row"><button className="btn" onClick={calc}>Calcular</button></div>
        {err && <div className="alert err">{err}</div>}
      </div>

      {res && (
        <div className="card result">
          <ExportButton />
          <h3>Relatório {res.numero ? "— contrato " + res.numero : ""}</h3>
          <div className="kpis">
            <KPI big label="Parcela (Price)" value={money(res.pmt)} />
            <KPI label="Taxa (a.m. / a.a.)" value={`${pct(res.im * 100)} · ${pct(res.iAnnual * 100)}`} />
            <KPI label="Total pago" value={money(res.totalPago)} />
            <KPI label="Total de juros" value={money(res.juros)} />
          </div>
          {res.avgM != null && (
            <>
              <div className="kpis" style={{ marginTop: 12 }}>
                <KPI label="Parcela na taxa média" value={money(res.pmtFair)} />
                <KPI label="Pago a mais / mês" value={money(res.diffMensal)} />
                <KPI big label="Pago a mais (total)" value={money(res.diffTotal)} />
              </div>
              {res.abusivo
                ? <span className="badge red">Taxa &gt; {fator.toLocaleString("pt-BR")}× a média de mercado — indício de abusividade</span>
                : <span className="badge green">Dentro de {fator.toLocaleString("pt-BR")}× a média de mercado</span>}
            </>
          )}
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Ver tabela de amortização ({res.N} parcelas)</summary>
            <table className="sched">
              <thead><tr><th>#</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo</th></tr></thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.k}><td>{r.k}</td><td>{money(r.pmt)}</td><td>{money(r.juros)}</td><td>{money(r.amort)}</td><td>{money(r.saldo)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
          <Disclaimer />
        </div>
      )}
    </>
  );
}
