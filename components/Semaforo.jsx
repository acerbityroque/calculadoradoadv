"use client";
// Semáforo de abusividade: barra com média (1x), limiar (fator) e taxa contratada.
// props: taxa (a.m. decimal), media (a.m. decimal), fator (ex 1.5)
export function Semaforo({ taxa, media, fator }) {
  if (taxa == null || media == null || media <= 0) return null;
  const mult = taxa / media;          // múltiplo sobre a média
  const limiar = media * fator;       // taxa-teto
  // escala da barra: 0 .. max(2*fator, mult) da média
  const escala = Math.max(fator * 2, mult, 1.6);
  const pct = (x) => Math.min(100, (x / escala) * 100);
  const cor = taxa > limiar ? "red" : (mult > 1.2 ? "amber" : "green");
  const rotulo = taxa > limiar ? "ABUSIVA" : (mult > 1.2 ? "ATENÇÃO" : "DENTRO DA MÉDIA");

  return (
    <div className={"semaforo " + cor}>
      <div className="sem-head">
        <span className={"sem-tag " + cor}>{rotulo}</span>
        <span className="sem-mult">{mult.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}× a média</span>
      </div>
      <div className="sem-bar">
        <div className="sem-zone green" style={{ left: 0, width: pct(media) + "%" }} />
        <div className="sem-zone amber" style={{ left: pct(media) + "%", width: (pct(limiar) - pct(media)) + "%" }} />
        <div className="sem-zone red" style={{ left: pct(limiar) + "%", right: 0 }} />
        <div className="sem-mark media" style={{ left: pct(media) + "%" }} title="Média BACEN (1×)" />
        <div className="sem-mark limiar" style={{ left: pct(limiar) + "%" }} title={"Limiar (" + fator + "×)"} />
        <div className="sem-mark taxa" style={{ left: pct(taxa) + "%" }} title="Taxa contratada" />
      </div>
      <div className="sem-legend">
        <span><i className="dot media" /> Média {(media * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.m.</span>
        <span><i className="dot limiar" /> Limiar {fator}× = {(limiar * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.m.</span>
        <span><i className="dot taxa" /> Contratada {(taxa * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.m.</span>
      </div>
    </div>
  );
}
