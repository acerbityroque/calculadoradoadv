"use client";
import { createContext, useContext, useState } from "react";

// Crédito FIXO do desenvolvedor (aparece no PDF e na página).
export const DEV_CREDITO = "Programa desenvolvido por Pablo Bandeira · Economista · CORECON/CE 3.521";
export const DEV_EMAIL = "bandeiraroque@gmail.com";

const Ctx = createContext({ fator: 1.5, setFator: () => {}, nome: "", setNome: () => {} });

export function SettingsProvider({ children }) {
  const [fator, setFator] = useState(1.5);
  const [nome, setNome] = useState("");
  return <Ctx.Provider value={{ fator, setFator, nome, setNome }}>{children}</Ctx.Provider>;
}

export function useFator() { return useContext(Ctx); }
export function useResponsavel() { return useContext(Ctx); }

// Campo: nome de quem está gerando o cálculo (vai para o PDF exportado).
export function NomeControl() {
  const { nome, setNome } = useContext(Ctx);
  return (
    <div className="nome-ctrl no-print">
      <span className="fator-lbl">Responsável pelo cálculo:</span>
      <input className="nome-input" type="text" placeholder="Seu nome (aparece no PDF)" value={nome} onChange={(e) => setNome(e.target.value)} />
    </div>
  );
}

// Barra de seleção do critério de abusividade (multiplicador da média de mercado).
export function FatorControl() {
  const { fator, setFator } = useContext(Ctx);
  const opts = [
    { v: 1.0, lbl: "1,0×", desc: "qualquer excesso" },
    { v: 1.3, lbl: "1,3×" },
    { v: 1.5, lbl: "1,5× (STJ)" },
  ];
  return (
    <div className="fator no-print">
      <span className="fator-lbl">Critério de abusividade:</span>
      <div className="seg">
        {opts.map((o) => (
          <button key={o.v} className={Math.abs(fator - o.v) < 1e-9 ? "on" : ""} onClick={() => setFator(o.v)} title={o.desc || ""}>{o.lbl}</button>
        ))}
        <span className="fator-cur">
          <input type="number" step="0.1" min="1" value={fator} onChange={(e) => setFator(Math.max(1, Number(e.target.value) || 1))} />×
        </span>
      </div>
    </div>
  );
}

// Marca d'água diagonal (impressão): nome do responsável, se informado.
export function PrintWatermark() {
  const { nome } = useContext(Ctx);
  const texto = nome && nome.trim() ? nome.trim() : "Demonstrativo de cálculo";
  return <div className="print-only watermark">{texto}</div>;
}

// Rodapé de assinatura (impressão): quem gerou + crédito fixo do desenvolvedor.
export function PrintFooter() {
  const { nome } = useContext(Ctx);
  const hoje = new Date().toLocaleDateString("pt-BR");
  return (
    <div className="print-only print-foot">
      {nome && nome.trim() ? <div><strong>Cálculo gerado por {nome.trim()}</strong> · {hoje}</div> : <div>Demonstrativo de cálculo · {hoje}</div>}
      <div className="dev-credit">{DEV_CREDITO} · {DEV_EMAIL}</div>
    </div>
  );
}
