'use client';

import React, { useEffect, useState } from 'react';
import KpiCard from '../../../components/ui/KpiCard';

type KpiResp = {
  productsCount: number;
  customersCount: number;
  ordersTodayCount: number;
  inventoryTotal: number;
};

export default function DashboardKpis() {
  const [kpis, setKpis] = useState<KpiResp | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/admin/kpis');
        if (!mounted) return;
        if (!res.ok) return;
        const json = await res.json();
        setKpis(json as KpiResp);
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <KpiCard title="Produtos" value={kpis ? kpis.productsCount : '...'} />
      <KpiCard title="Pedidos Hoje" value={kpis ? kpis.ordersTodayCount : '...'} />
      <KpiCard title="Clientes" value={kpis ? kpis.customersCount : '...'} />
    </>
  );
}
