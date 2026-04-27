const TONES = {
  blue: 'from-blue-500/18 to-sky-500/6 border-blue-400/18',
  red: 'from-red-500/16 to-orange-500/6 border-red-400/18',
  cyan: 'from-cyan-500/16 to-blue-500/6 border-cyan-400/18',
  orange: 'from-orange-500/16 to-amber-500/6 border-orange-400/18',
  neutral: 'from-slate-500/10 to-slate-800/10 border-slate-800'
};

export default function MetricCard({ label, value, unit, hint, tone = 'neutral' }) {
  return (
    <div className={`rounded-[1.35rem] border bg-gradient-to-br ${TONES[tone] || TONES.neutral} bg-slate-950/72 p-4 shadow-lg shadow-black/20`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-current text-blue-300 opacity-70" />
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className="font-mono text-3xl font-black leading-none text-white">{value}</span>
        <span className="pb-1 text-xs font-bold text-slate-400">{unit}</span>
      </div>
    </div>
  );
}
