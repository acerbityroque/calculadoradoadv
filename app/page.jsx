"use client";
import { useState } from "react";
import { SettingsProvider, FatorControl, NomeControl, PrintWatermark, PrintFooter, DEV_CREDITO, DEV_EMAIL } from "@/components/Settings";
import Consignado from "@/components/calculators/Consignado";
import RMC from "@/components/calculators/RMC";
import RCC from "@/components/calculators/RCC";
import CartaoVariavel from "@/components/calculators/CartaoVariavel";
import Veiculos from "@/components/calculators/Veiculos";
import EmprestimoQuitado from "@/components/calculators/EmprestimoQuitado";
import Descontos from "@/components/calculators/Descontos";
import Meses from "@/components/calculators/Meses";

const GROUPS = [
  {
    label: "Cartão consignado",
    items: [
      { id: "rmc", ico: "💳", label: "Calculadora de RMC", sub: "Reserva de Margem Consignável" },
      { id: "rmcv", ico: "💳", label: "Calculadora de RMC Variável", sub: "RMC com descontos variáveis" },
      { id: "rcc", ico: "🪪", label: "Calculadora de RCC", sub: "Reserva de Cartão de Crédito" },
      { id: "rccv", ico: "🪪", label: "Calculadora de RCC Variável", sub: "RCC com descontos variáveis" },
    ],
  },
  {
    label: "Revisionais",
    items: [
      { id: "consignado", ico: "📄", label: "Revisional Consignado", sub: "Taxa de juros do empréstimo" },
      { id: "veiculos", ico: "🚗", label: "Revisional de Automóveis", sub: "Financiamento + Tabela FIPE" },
      { id: "quitado", ico: "🧾", label: "Empréstimo Quitado", sub: "Relatório do contrato pago" },
    ],
  },
  {
    label: "Descontos indevidos",
    items: [
      { id: "assoc", ico: "🏷️", label: "Descontos de Associações", sub: "Desconto fixo mensal" },
      { id: "assocv", ico: "🏷️", label: "Descontos de Associações Variável", sub: "Valores variáveis" },
      { id: "emprest", ico: "📉", label: "Descontos de Empréstimo", sub: "Parcelas indevidas" },
    ],
  },
  {
    label: "Utilitários",
    items: [
      { id: "meses", ico: "📅", label: "Calculadora de Meses", sub: "Competências entre datas" },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export default function Page() {
  const [view, setView] = useState("consignado");
  const current = ALL.find((i) => i.id === view);

  return (
    <SettingsProvider>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <div className="seal">CA</div>
            <h1>CARTEIRA DO ADVOGADO<small>Calculadoras Revisionais</small></h1>
          </div>
          <nav className="nav">
            {GROUPS.map((g) => (
              <div key={g.label} className="nav-group">
                <div className="nav-label">{g.label}</div>
                {g.items.map((i) => (
                  <button key={i.id} className={view === i.id ? "active" : ""} onClick={() => setView(i.id)}>
                    <span className="ico">{i.ico}</span> {i.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="credit">
            {DEV_CREDITO}<br /><a href={`mailto:${DEV_EMAIL}`}>{DEV_EMAIL}</a>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div>
              <h2>{current.label}</h2>
              <div className="sub">{current.sub}</div>
            </div>
            <div className="topbar-ctrls">
              <NomeControl />
              <FatorControl />
            </div>
          </div>
          <div className="content">
            <div className="print-only print-header">
              <div className="ph-title">Carteira do Advogado — {current.label}</div>
              <div className="ph-sub">Demonstrativo de cálculo · {new Date().toLocaleDateString("pt-BR")}</div>
            </div>
            <PrintWatermark />
            {view === "rmc" && <RMC />}
            {view === "rmcv" && <CartaoVariavel titulo="RMC Variável" sub="Reserva de Margem Consignável — descontos variáveis" />}
            {view === "rcc" && <RCC />}
            {view === "rccv" && <CartaoVariavel titulo="RCC Variável" sub="Reserva de Cartão de Crédito — descontos variáveis" />}
            {view === "consignado" && <Consignado />}
            {view === "veiculos" && <Veiculos />}
            {view === "quitado" && <EmprestimoQuitado />}
            {view === "assoc" && <Descontos titulo="Descontos de Associações" sub="Some os descontos associativos indevidos no benefício e apure a devolução." variavel={false} />}
            {view === "assocv" && <Descontos titulo="Descontos de Associações Variável" sub="Descontos associativos com valores que mudaram ao longo do tempo." variavel={true} />}
            {view === "emprest" && <Descontos titulo="Descontos de Empréstimo" sub="Some as parcelas de empréstimo indevidamente descontadas e apure a devolução." variavel={false} />}
            {view === "meses" && <Meses />}
            <PrintFooter />
          </div>
        </main>
        <div className="credit-float no-print">{DEV_CREDITO} · {DEV_EMAIL}</div>
      </div>
    </SettingsProvider>
  );
}
