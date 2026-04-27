'use client';

function mapPoint(h, p) {
  const x = 70 + ((h - 180) / 260) * 660;
  const y = 370 - ((p - 2) / 24) * 300;
  return { x, y };
}

export default function MollierDiagram({ params }) {
  const bp = params?.bp ?? 4.5;
  const hp = params?.hp ?? 18.2;
  const sh = params?.sh ?? 5;
  const sc = params?.sc ?? 3;

  const p1 = mapPoint(355 + sh * 1.5, bp);
  const p2 = mapPoint(395 + hp * 1.2, hp);
  const p3 = mapPoint(245 - sc * 2.2, hp);
  const p4 = mapPoint(245 - sc * 2.2, bp);
  const cyclePath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${p1.x} ${p1.y}`;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Diagramme pédagogique simplifié</p>
          <h3 className="text-xl font-black text-white">Mollier P-h</h3>
        </div>
        <p className="max-w-sm text-right text-xs text-slate-500">Vue pédagogique, non dimensionnante. Elle sert à relier les variations BP/HP/SH/SR au cycle.</p>
      </div>

      <svg viewBox="0 0 800 430" className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id="dome" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0.18)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[2, 6, 10, 14, 18, 22, 26].map((p) => {
          const y = mapPoint(180, p).y;
          return <line key={p} x1="65" y1={y} x2="735" y2={y} stroke="rgba(148,163,184,0.13)" strokeWidth="1" />;
        })}
        {[200, 250, 300, 350, 400].map((h) => {
          const x = mapPoint(h, 2).x;
          return <line key={h} x1={x} y1="65" x2={x} y2="375" stroke="rgba(148,163,184,0.13)" strokeWidth="1" />;
        })}

        <path d="M 210 365 C 250 230, 315 112, 400 86 C 485 112, 550 230, 590 365 Z" fill="url(#dome)" stroke="rgba(148,163,184,0.32)" strokeWidth="2" />
        <path d={cyclePath} fill="none" stroke="white" strokeWidth="4" filter="url(#glow)" strokeLinejoin="round" />

        {[
          { p: p1, label: '1 Aspiration', color: '#38bdf8' },
          { p: p2, label: '2 Refoulement', color: '#ef4444' },
          { p: p3, label: '3 Liquide HP', color: '#f97316' },
          { p: p4, label: '4 Détente', color: '#22c55e' }
        ].map((point) => (
          <g key={point.label}>
            <circle cx={point.p.x} cy={point.p.y} r="8" fill={point.color} stroke="white" strokeWidth="2" />
            <text x={point.p.x + 12} y={point.p.y - 10} fill="white" fontSize="13" fontWeight="800">{point.label}</text>
          </g>
        ))}

        <line x1="70" y1="375" x2="740" y2="375" stroke="rgba(226,232,240,0.7)" strokeWidth="2" />
        <line x1="70" y1="375" x2="70" y2="62" stroke="rgba(226,232,240,0.7)" strokeWidth="2" />
        <text x="390" y="415" fill="rgba(226,232,240,0.8)" fontSize="13" fontWeight="700">Enthalpie h</text>
        <text x="16" y="225" fill="rgba(226,232,240,0.8)" fontSize="13" fontWeight="700" transform="rotate(-90 16 225)">Pression P</text>
      </svg>
    </div>
  );
}
