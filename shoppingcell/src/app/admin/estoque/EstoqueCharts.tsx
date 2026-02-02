'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

type Row = {
  status: 'OK' | 'Baixo' | 'Zerado' | string;
  quantity: number;
  min: number;
};

export function EstoqueCharts({ rows }: { rows: Row[] }) {
  const { pieData, low, zero, ok } = useMemo(() => {
    const ok = rows.filter((r) => r.status === 'OK').length;
    const low = rows.filter((r) => r.status === 'Baixo').length;
    const zero = rows.filter((r) => r.status === 'Zerado').length;

    const pieData = [
      { name: 'OK', value: ok },
      { name: 'Baixo', value: low },
      { name: 'Zerado', value: zero },
    ].filter((x) => x.value > 0);

    return { pieData, low, zero, ok };
  }, [rows]);

  const colors = {
    OK: '#22c55e',
    Baixo: '#facc15',
    Zerado: '#ef4444',
  } as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] md:col-span-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">Saúde do estoque</div>
          <div className="text-xs text-slate-500">distribuição por status</div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 14 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={(colors as any)[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid content-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">OK</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-100">{ok}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Baixo</div>
              <div className="mt-2 text-3xl font-extrabold text-yellow-300">{low}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zerado</div>
              <div className="mt-2 text-3xl font-extrabold text-red-200">{zero}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="text-sm font-semibold text-slate-200">Resumo</div>
        <div className="mt-2 text-xs text-slate-500">Total de itens analisados</div>
        <div className="mt-3 text-4xl font-extrabold text-slate-100">{rows.length}</div>
        <div className="mt-4 text-xs text-slate-500">
          Dica: use a busca para ver a saúde de um subconjunto.
        </div>
      </div>
    </div>
  );
}
