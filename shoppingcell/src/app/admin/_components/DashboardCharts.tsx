'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function shortDay(s: string) {
  // yyyy-mm-dd -> dd/mm
  const [, m, d] = String(s || '').split('-');
  if (!d) return s;
  return `${d}/${m}`;
}

export type DashboardDay = {
  day: string; // yyyy-mm-dd
  income: number;
  expense: number;
  ordersConfirmed: number;
};

function money(n: number) {
  return `R$ ${n.toFixed(2)}`;
}

export default function DashboardCharts({ data }: { data: DashboardDay[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">Caixa (30 dias)</div>
          <div className="text-xs text-slate-500">Entradas x Saídas</div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" opacity={0.35} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={shortDay}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 14 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(v: any, name: any) => [money(Number(v || 0)), String(name)]}
              />
              <Area
                type="monotone"
                dataKey="income"
                name="Entradas"
                stroke="#22c55e"
                fill="url(#inc)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Saídas"
                stroke="#ef4444"
                fill="url(#exp)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">Pedidos confirmados (30 dias)</div>
          <div className="text-xs text-slate-500">por dia</div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ord" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#facc15" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#facc15" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" opacity={0.35} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={shortDay}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 14 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="ordersConfirmed"
                name="Confirmados"
                stroke="#facc15"
                fill="url(#ord)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
