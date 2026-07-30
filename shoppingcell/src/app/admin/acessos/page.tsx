import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Select } from '@/app/admin/_components/ui/Select';

export const dynamic = 'force-dynamic';

export default async function AcessosPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: isOwner } = await supabase.rpc('is_admin_owner');

  async function addAdmin(formData: FormData) {
    'use server';
    const userId = String(formData.get('user_id') || '').trim();
    const role = String(formData.get('role') || 'staff').trim();

    const supabase = await createSupabaseServerClient();
    await supabase.from('admin_users').insert({ user_id: userId, role } as any);
    revalidatePath('/admin/acessos');
  }

  async function updateRole(formData: FormData) {
    'use server';
    const userId = String(formData.get('user_id') || '').trim();
    const role = String(formData.get('role') || '').trim();

    const supabase = await createSupabaseServerClient();
    await supabase
      .from('admin_users')
      .update({ role } as any)
      .eq('user_id', userId);
    revalidatePath('/admin/acessos');
  }

  async function removeAdmin(formData: FormData) {
    'use server';
    const userId = String(formData.get('user_id') || '').trim();

    const supabase = await createSupabaseServerClient();
    await supabase.from('admin_users').delete().eq('user_id', userId);
    revalidatePath('/admin/acessos');
  }

  const { data: admins } = await supabase.rpc('list_admin_users');

  if (!user) {
    return null;
  }

  if (!isOwner) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <PageHeader title="Controle de Acessos" subtitle="Gerencie os níveis de acesso ao painel administrativo" backHref="/admin" />
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
          Somente o <span className="font-semibold text-yellow-400">Proprietário (Owner)</span> possui autorização para alterar acessos.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Controle de Acessos"
        subtitle="Gerenciamento de permissões da equipe e administradores"
        backHref="/admin"
      />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-extrabold text-slate-100">Adicionar Novo Administrador</div>
        <div className="mt-1 text-xs text-slate-400">
          Cole o <span className="font-semibold text-slate-200">ID de Usuário (UUID)</span> gerado pelo Supabase Auth.
        </div>

        <form action={addAdmin} className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_160px]">
          <Input name="user_id" placeholder="ID do Usuário (uuid)" required />
          <Select name="role" defaultValue="staff">
            <option value="owner">Proprietário (Owner)</option>
            <option value="manager">Gerente (Manager)</option>
            <option value="staff">Vendedor / Equipe (Staff)</option>
          </Select>
          <Button type="submit">Adicionar</Button>
        </form>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-extrabold text-slate-100">Administradores e Vendedores Cadastrados</div>
        <div className="mt-4 space-y-3">
          {Array.isArray(admins) && admins.length > 0 ? (
            admins.map((a: any) => (
              <div key={a.user_id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">{a.email || '—'}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">ID: {a.user_id}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={updateRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={a.user_id} />
                      <Select name="role" defaultValue={a.role || 'staff'}>
                        <option value="owner">Proprietário (Owner)</option>
                        <option value="manager">Gerente (Manager)</option>
                        <option value="staff">Vendedor / Equipe (Staff)</option>
                      </Select>
                      <Button type="submit" variant="ghost">
                        Salvar
                      </Button>
                    </form>

                    <form action={removeAdmin}>
                      <input type="hidden" name="user_id" value={a.user_id} />
                      <Button type="submit" variant="danger">
                        Remover
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
              Nenhum administrador listado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
