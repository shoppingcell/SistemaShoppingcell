export const dynamic = 'force-dynamic';

export default async function RhPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">RH</h1>
        <p className="mt-1 text-sm text-slate-400">Módulo interno (funcionários, folha e despesas de RH).</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
        <div className="font-semibold text-slate-200">Próximos passos (MVP)</div>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Cadastro de funcionários (nome, cargo, salário, data de admissão, status).</li>
          <li>Lançamentos: salário/pagamentos (gera saída no Financeiro).</li>
          <li>Relatórios: custo por dia/semana/mês.</li>
        </ul>
      </div>
    </div>
  );
}
