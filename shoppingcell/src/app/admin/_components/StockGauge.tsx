'use client';

export default function StockGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));

  // Semi-circle gauge: stroke-dasharray control
  const r = 70;
  const c = Math.PI * r;
  const filled = (c * v) / 100;

  return (
    <div className="grid place-items-center">
      <svg width="180" height="110" viewBox="0 0 180 110">
        <g transform="translate(90,90)">
          <path
            d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
            fill="none"
            stroke="#1f2937"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
            fill="none"
            stroke="#facc15"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c}`}
            style={{ filter: 'drop-shadow(0 0 10px rgba(250,204,21,0.35))' }}
          />
        </g>
        <text x="90" y="78" textAnchor="middle" fontSize="28" fill="#e2e8f0" fontWeight="800">
          {v}%
        </text>
        <text x="90" y="98" textAnchor="middle" fontSize="12" fill="#94a3b8">
          Stock Health
        </text>
      </svg>
    </div>
  );
}
