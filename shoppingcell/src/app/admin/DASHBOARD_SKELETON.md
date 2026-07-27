# Esboço do Dashboard Admin — Shoppingcell

## Objetivo
Esboçar rotas, layout e componentes principais para um dashboard moderno e completo que cubra gestão de vendas, PDV, financeiro, RH, estoque, produtos, pedidos, clientes e configurações.

## Estrutura de Rotas (Next.js App Router)
- `/admin` → Dashboard home (visão geral: KPIs, vendas do dia, caixa, notificações)
- `/admin/pdv` → PDV (tela de vendas rápida)
- `/admin/vendas` → Lista de vendas; `/admin/vendas/[id]` → detalhe/comprovante
- `/admin/caixa` → Fluxo de caixa, fechamento do dia
- `/admin/produtos` → CRUD produtos; `/admin/produtos/novo` e `/admin/produtos/[id]`
- `/admin/estoque` → Inventário, entradas/saídas, alertas de baixo estoque
- `/admin/pedidos` → Pedidos online; `/admin/pedidos/[id]`
- `/admin/clientes` → Gestão de clientes
- `/admin/financeiro` → Lançamentos, contas a pagar/receber
- `/admin/rh` → Funcionários, escalas, ponto
- `/admin/integracoes` → Configurações de integração (Google Sheets, WhatsApp, etc.)
- `/admin/config` → Configurações do site, usuários admin, permissões

## Layout / Shell
- `AdminLayout` (já existe) para autenticação e role-check
- `AdminShellClient` (UI): sidebar (menu com seções), topbar (busca, usuário, notificações), content area com grid responsivo
- Componentes de layout:
  - `Sidebar` (itens agrupados por funcionalidade)
  - `Topbar` (breadcrumb opcional, ações rápidas)
  - `KpiCard` (métrica resumida)
  - `DataTable` (tabela com paginação e ações)
  - `EntityForm` (formulário reutilizável com validação `zod`)
  - `Modal` e `Drawer` (ações rápidas e edição)

## Prioridade de Implementação (MVP)
1. `/admin` — KPIs, vendas recentes, caixa rápido
2. `/admin/pdv` — Tela de venda (cart + finalização)
3. `/admin/produtos` — Listar/Adicionar/Edit
4. `/admin/pedidos` — Listar/Detalhar
5. Autenticação/roles (confirmar RLS e permissões)

## Integrações de Dados
- Usar `createSupabaseServerClient()` para páginas server-side.
- `supabaseBrowser` para clientes que precisam de auth/checkboxes no client.
- `createSupabaseServiceClient()` para tarefas back-end (webhooks, jobs).

## Permissões e Segurança
- Manter `SUPABASE_SERVICE_ROLE_KEY` apenas em server envs.
- Revisar políticas RLS por tabela (`products`, `orders`, `inventory`, `finance_transactions`, `admin_users`, `staff_profiles`).
- Implementar checagens de role no server (ex.: `requireAdmin` já existe).

## UI / Tema
- Tema moderno: cores neutras + destaque (verde/azul), tipografia clara, spacing consistentes.
- Component library: aproveitar componentes existentes em `src/components/ui/` e criar tokens de tema.

## Assets e Hero
- O `Hero` da landing page será implementado separadamente (scroll-scrub de imagens). Mapear assets antes de implementar.

## Tarefas seguintes sugeridas
- Mapear a pasta de assets do Hero e confirmar nomes/ordem das imagens.
- Criar o componente `Hero` protótipo em `src/app/ScrollScrubHeroClient.tsx` (ou substituir o existente `ScrollScrubHeroClient.tsx`).
- Implementar `AdminShellClient` refinado com placeholders para cada rota.

---
Arquivo gerado automaticamente pelo assistente. Se quiser, eu já crio os componentes iniciais (`Sidebar`, `Topbar`, `KpiCard`) e esqueleto de páginas (`/admin/pdv`, `/admin/produtos`).
