'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export function InventoryStatusMini({ ok, low, zero }: { ok: number; low: number; zero: number }) {
  const data = [
    { name: 'OK', value: ok },
    { name: 'Baixo', value: low },
    { name: 'Zerado', value: zero },
  ].filter((x) => x.value > 0);

  const colors: Record<string, string> = {
    OK: '#22c55e',
    Baixo: '#facc15',
    Zerado: '#ef4444',
  };

  return (
    <div className="grid gap-4">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 14 }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={colors[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-xs text-slate-500">OK</div>
          <div className="mt-1 text-lg font-extrabold text-slate-100">{ok}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-xs text-slate-500">Baixo</div>
          <div className="mt-1 text-lg font-extrabold text-yellow-300">{low}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-xs text-slate-500">Zerado</div>
          <div className="mt-1 text-lg font-extrabold text-red-200">{zero}</div>
        </div>
      </div>
    </div>
  );
}
