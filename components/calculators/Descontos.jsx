"use client";
import { useState } from "react";
import { parseNum, totalDescontos, indebito, formatBRL } from "@/lib/finance";
import { Field, KPI, money, Disclaimer, ExportButton } from "@/components/ui";
import RowsEditor from "@/components/RowsEditor";

// Genérico para: Descontos de Associações (fixo/variável) e Descontos de Empréstimo.
// Soma os valores indevidamente descontados e calcula a devolução (simples / em dobro - CDC 42).
export default function Descontos({
  titulo = "Descontos de Associações",
  sub = "Some os descontos indevidos no benefício e apure a devolução.",
  variavel = false,
}) {
  const [valor, setValor] = useState("");
  const [meses, setMeses] = useState("");
  const [rows, setRows] = useState([{ valor: "", meses: "" }]);
  const [dobro, setDobro] = useState(true);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  function calc() {
    setErr("");
    let total = 0, qtd = 0;
    if (variavel) {
      const t = totalDescontos(rows);
      total = t.total; qtd = t.meses;
      if (total <= 0) { setErr("Informe ao menos um período com valor e meses."); setRes(null); return; }
    } else {
      const v = parseNum(valor), m = parseInt(meses, 10);
      if (!(v > 0) || !(m > 0)) { setErr("Informe o valor mensal e a quantidade de meses."); setRes(null); return; }
      total = v * m; qtd = m;
    }
    setRes({ total, qtd, devolucao: indebito(total, dobro), dobro });
  }

  return (
    <>
      <div className="card">
        <h3>{titulo}</h3>
        <p className="hint">{sub}</p>
        {variavel ? (
          <Field label="Descontos mensais (por período)"><RowsEditor rows={rows} setRows={setRows} /></Field>
        ) : (
          <div className="grid">
            <Field label="Valor descontado por mês (R$)"><input inputMode="decimal" placeholder="50,00" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
            <Field label="Quantidade de meses"><input inputMode="numeric" placeholder="24" value={meses} onChange={(e) => setMeses(e.target.value)} /></Field>
          </div>
        )}
        <label className="check"><input type="checkbox" checked={dobro} onChange={(e) => setDobro(e.target.checked)} /> Devolução em dobro (CDC, art. 42, parágrafo único)</label>
        <div className="btn-row" style={{ marginTop: 14 }}><button className="btn" onClick={calc}>Calcular</button></div>
        {err && <div className="alert err">{err}</div>}
      </div>

      {res && (
        <div className="card result">
          <ExportButton />
          <h3>Resultado — {titulo}</h3>
          <div className="kpis">
            <KPI label="Meses descontados" value={res.qtd} />
            <KPI label="Total descontado" value={money(res.total)} />
            <KPI big label={res.dobro ? "Devolução em dobro" : "Devolução (simples)"} value={money(res.devolucao)} />
          </div>
          <div className="alert warn">Valor sujeito a correção monetária e juros desde cada desconto. Some honorários e eventuais danos morais conforme o caso.</div>
          <Disclaimer />
        </div>
      )}
    </>
  );
}
