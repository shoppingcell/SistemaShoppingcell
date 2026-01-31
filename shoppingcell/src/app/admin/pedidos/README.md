## Pedidos (WhatsApp)

MVP flow:
- /admin/pedidos -> list
- /admin/pedidos/novo -> create draft + items
- /admin/pedidos/[id] -> send to WhatsApp via wa.me

DB required: run `supabase/admin_patch_orders.sql`.
