"use client";
import { formatBRL, formatPct } from "@/lib/finance";

export function Field({ label, help, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {help ? <span className="help">{help}</span> : null}
    </div>
  );
}

export function KPI({ label, value, big }) {
  return (
    <div className={"kpi" + (big ? " big" : "")}>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </div>
  );
}

export function money(n) { return formatBRL(n); }
export function pct(n, d = 2) { return formatPct(n, d); }

export function Disclaimer() {
  return (
    <div className="disclaimer">
      <strong>Aviso:</strong> os valores são estimativas matemáticas para apoio à análise
      revisional e não constituem aconselhamento jurídico ou financeiro definitivo. As taxas
      médias são obtidas do BACEN (SGS) e os valores de veículos da Tabela FIPE, podendo variar.
      Confira os números com a documentação do contrato antes de protocolar qualquer peça.
    </div>
  );
}

// Assinatura/credito do autor (usada no rodape de impressao).
export const ASSINATURA = "Pablo Bandeira | Economista | CORECON/CE 3.521";

// Botao de exportacao: aciona a impressao (Salvar como PDF) so do resultado.
export function ExportButton() {
  return (
    <button type="button" className="export-btn no-print" onClick={() => window.print()} title="Salvar este resultado em PDF">
      Exportar PDF
    </button>
  );
}
