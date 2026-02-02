'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export type OrdersDay = {
  day: string; // yyyy-mm-dd
  drafts: number;
  sent: number;
  confirmed: number;
};

function shortDay(s: string) {
  const [y, m, d] = String(s || '').split('-');
  if (!d) return s;
  return `${d}/${m}`;
}

export function PedidosCharts({ data }: { data: OrdersDay[] }) {
  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-200">Pedidos (30 dias)</div>
        <div className="text-xs text-slate-500">rascunho / enviado / confirmado</div>
      </div>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="draft" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="conf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity={0.35} />
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
              dataKey="drafts"
              name="Rascunho"
              stroke="#94a3b8"
              fill="url(#draft)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="sent"
              name="Enviado"
              stroke="#f97316"
              fill="url(#sent)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="confirmed"
              name="Confirmado"
              stroke="#facc15"
              fill="url(#conf)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
