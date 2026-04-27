import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getDiagnosticAdvice } from '@/lib/diagnostics';

export default function DiagnosticPanel({ params }) {
  const advice = getDiagnosticAdvice(params);
  const nominal = advice.length === 1 && advice[0].label === 'Cycle cohérent';

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="mb-4 flex items-center gap-3">
        {nominal ? <CheckCircle2 className="text-emerald-400" /> : <AlertTriangle className="text-amber-400" />}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Diagnostic assisté</p>
          <h3 className="font-black text-white">Lecture croisée des valeurs</h3>
        </div>
      </div>
      <div className="space-y-3">
        {advice.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="font-black text-white">{item.label}</p>
            <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
