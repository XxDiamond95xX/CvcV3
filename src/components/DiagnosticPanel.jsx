import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { getDiagnosticAdvice } from '@/lib/diagnostics';

const STYLES = {
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  info: 'border-blue-400/25 bg-blue-500/10 text-blue-100',
  warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  danger: 'border-red-400/30 bg-red-500/10 text-red-100'
};

function SeverityIcon({ severity }) {
  if (severity === 'success') return <CheckCircle2 className="text-emerald-400" size={18} />;
  if (severity === 'danger') return <ShieldAlert className="text-red-400" size={18} />;
  if (severity === 'info') return <Info className="text-blue-300" size={18} />;
  return <AlertTriangle className="text-amber-400" size={18} />;
}

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
          <div key={item.label} className={`rounded-2xl border p-4 ${STYLES[item.severity] ?? STYLES.info}`}>
            <div className="flex items-start gap-3">
              <SeverityIcon severity={item.severity} />
              <div>
                <p className="font-black text-white">{item.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-relaxed text-slate-400">
        <span className="font-black text-slate-200">Méthode terrain :</span> stabiliser la machine, relever les quatre valeurs, contrôler les échangeurs, puis seulement formuler une hypothèse d’intervention.
      </div>
    </div>
  );
}
