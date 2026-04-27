export default function MetricCard({ label, value, unit, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-end gap-1">
        <span className="font-mono text-2xl font-black text-white">{value}</span>
        <span className="pb-1 text-xs font-bold text-slate-400">{unit}</span>
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
