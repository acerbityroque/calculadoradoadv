import "./globals.css";

export const metadata = {
  title: "Carteira do Advogado — Calculadoras Revisionais",
  description: "Calculadoras de RMC, RCC, Consignado e Revisional de Automóveis (FIPE/BACEN).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
