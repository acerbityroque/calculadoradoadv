"use client";
import { useState } from "react";
import { monthsBetween } from "@/lib/finance";
import { Field, ExportButton } from "@/components/ui";

export default function Meses() {
  const [ini, setIni] = useState("");
  const [fim, setFim] = useState("");
  const [res, setRes] = useState(null);

  function calc() {
    const m = monthsBetween(ini, fim);
    setRes(m);
  }

  return (
    <>
      <div className="card">
        <h3>Informações das Datas</h3>
        <p className="hint">Conta os meses (competências) entre a data inicial e a final — útil para apurar parcelas descontadas.</p>
        <div className="grid">
          <Field label="Data inicial"><input type="date" value={ini} onChange={(e) => setIni(e.target.value)} /></Field>
          <Field label="Data final"><input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></Field>
        </div>
        <div className="btn-row"><button className="btn" onClick={calc}>Calcular</button></div>
      </div>

      {res != null && (
        <div className="card result">
          <ExportButton />
          <h3>Resultado</h3>
          <div className="kpis">
            <div className="kpi big"><div className="lbl">Meses</div><div className="val">{res < 0 ? "—" : res}</div></div>
          </div>
          {res < 0 && <div className="alert err">A data final é anterior à inicial.</div>}
        </div>
      )}
    </>
  );
}
