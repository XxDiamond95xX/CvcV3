import { AlertTriangle, CheckCircle2, Stethoscope } from 'lucide-react';
import { getDiagnosticAdvice } from '@/lib/diagnostics';

export default function DiagnosticPanel({ params }) {
  const advice = getDiagnosticAdvice(params);
  const nominal = advice.length === 1 && advice[0].label === 'Cycle cohérent';

  return (
    <div className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/76 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl ${nominal ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
            {nominal ? <CheckCircle2 /> : <AlertTriangle />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Diagnostic assisté</p>
            <h3 className="font-black text-white">Lecture croisée des valeurs</h3>
          </div>
        </div>
        <Stethoscope className="hidden text-slate-700 sm:block" size={22} />
      </div>

      <div className="space-y-3">
        {advice.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/62 p-4">
            <p className="font-black text-white">{item.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4 text-sm leading-relaxed text-blue-50/90">
        <p className="font-black text-blue-100">Méthode pro</p>
        <p className="mt-1">Ne conclus jamais sur une seule valeur. Croise pressions, températures, échangeurs, débit d’air/eau et contexte d’installation.</p>
      </div>
    </div>
  );
}
