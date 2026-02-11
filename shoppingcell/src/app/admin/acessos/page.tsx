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
        <PageHeader title="Acessos" subtitle="Gerencie quem entra no painel admin" backHref="/admin" />
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
          Somente o <span className="font-semibold">owner</span> consegue gerenciar acessos.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Acessos"
        subtitle="Somente admin_users entram no /admin (owner gerencia)"
        backHref="/admin"
      />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-extrabold">Adicionar admin</div>
        <div className="mt-1 text-xs text-slate-400">
          Cole o <span className="font-semibold">User ID</span> do Supabase Auth (UUID). O e-mail aparece
          automaticamente.
        </div>

        <form action={addAdmin} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_160px]">
          <Input name="user_id" placeholder="user_id (uuid)" required />
          <Select name="role" defaultValue="staff">
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </Select>
          <Button type="submit">Adicionar</Button>
        </form>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-extrabold">Admins atuais</div>
        <div className="mt-4 space-y-3">
          {Array.isArray(admins) && admins.length > 0 ? (
            admins.map((a: any) => (
              <div key={a.user_id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">{a.email || '—'}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{a.user_id}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={updateRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={a.user_id} />
                      <Select name="role" defaultValue={a.role || 'staff'}>
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
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
              Nenhum admin listado (ou você não é owner).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
