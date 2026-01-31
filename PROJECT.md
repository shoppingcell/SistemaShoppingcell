# Projeto: ShoppingCell / Vendedoria

URL: https://vendedoria.xyz

## Objetivo
SaaS (MVP) para catálogo + estoque + pedidos (WhatsApp) com painel admin. Integração com Google Sheets (planilha) para importar dados e, em breve, escrever de volta (sincronizar saídas do sistema na planilha).

## Status atual (2026-01-31)
### Já funcionando
- Admin com Supabase Auth.
- Produtos/Categorias/Estoque.
- Sync Google Sheets → Supabase (importa produtos, categorias e estoque).
- Travas automáticas: quando editar no Admin, o campo fica manual e a planilha não sobrescreve.
- Pedidos (WhatsApp) implementado no código (precisa SQL no Supabase se ainda não rodou).
- Roteamento Traefik corrigido via arquivo dedicado: `/etc/easypanel/traefik/config/custom-shoppingcell.yaml`.

### Decisões
- Login preferido: **e-mail + senha** (senha-first).
- Estoque: saídas no sistema devem refletir na planilha (Google Sheets API). Planilha vira espelho (não sobrescrever manual).

## Checklist (próximos passos)
### Infra/Config
- [ ] Confirmar senha do usuário admin no Supabase (password recovery).
- [ ] Criar credenciais Google Sheets API (Service Account) e compartilhar a planilha com o e-mail do SA.

### Banco (Supabase)
- [ ] Rodar SQL master/migrations (idempotente) para evitar colunas faltando.
- [ ] Rodar SQL de pedidos (orders/order_items) se ainda não foi rodado.

### Funcionalidades
- [ ] Login UI: senha-first; remover/confundir menos OTP.
- [ ] Estoque: ao confirmar pedido → registrar movimentação e atualizar estoque.
- [ ] Sheets write-back: atualizar coluna de estoque na planilha ao confirmar pedido/ajuste.
- [ ] Busca/filtros em Produtos e Estoque (566+ itens).

## Links
- Planilha: https://docs.google.com/spreadsheets/d/16Kz_lWC2JlyG6kiv7qVr8fpBKyXbwKbxrQCjH7OVTIs/edit?usp=sharing
- CSV: https://docs.google.com/spreadsheets/d/16Kz_lWC2JlyG6kiv7qVr8fpBKyXbwKbxrQCjH7OVTIs/gviz/tq?tqx=out:csv

## Observações técnicas
- Next.js App Router.
- Supabase SSR auth cookies via `@supabase/ssr`.
- Admin: rotas /admin/* protegidas por middleware.
