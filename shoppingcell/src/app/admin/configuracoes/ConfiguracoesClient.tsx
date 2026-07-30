'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';
import {
  Code, Copy, Check, Eye, Image as ImageIcon, Key, Layout,
  Link as LinkIcon, LockKeyhole, RefreshCw, Save, Send, Settings, Sparkles, Terminal,
  Webhook, Zap, Sliders, Play, Video
} from 'lucide-react';

type SettingsData = {
  logo_url: string;
  logo_text: string;
  hero_title: string;
  hero_subtitle: string;
  hero_video_url: string;
  hero_cta_text: string;
  whatsapp_number: string;
  n8n_webhook_orders: string;
  n8n_webhook_stock: string;
  n8n_api_key: string;
};

export function ConfiguracoesClient({ initialSettings }: { initialSettings: SettingsData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'hero' | 'apis' | 'n8n'>('hero');
  const [form, setForm] = useState<SettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedApi, setSelectedApi] = useState<'get_products' | 'post_product' | 'get_kpis' | 'sync_sheets'>('get_products');
  const [apiFormat, setApiFormat] = useState<'curl' | 'js' | 'python'>('curl');

  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (json.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        router.refresh();
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  }

  function generateNewApiKey() {
    const randomHex = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const newKey = `sc_live_${randomHex}`;
    setForm((prev) => ({ ...prev, n8n_api_key: newKey }));
  }

  const apiSnippets = {
    get_products: {
      title: 'GET /api/admin/products',
      desc: 'Retorna a lista completa de produtos cadastrados com categoria, preço e saldo de estoque.',
      curl: `curl -X GET "https://www.shoppingcell.tech/api/admin/products" \\\n  -H "Authorization: Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}"`,
      js: `const response = await fetch("https://www.shoppingcell.tech/api/admin/products", {\n  headers: {\n    "Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}"\n  }\n});\nconst data = await response.json();\nconsole.log(data);`,
      python: `import requests\n\nurl = "https://www.shoppingcell.tech/api/admin/products"\nheaders = {"Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}"}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())`,
    },
    post_product: {
      title: 'POST /api/admin/products',
      desc: 'Cadastra ou atualiza um produto no sistema.',
      curl: `curl -X POST "https://www.shoppingcell.tech/api/admin/products" \\\n  -H "Authorization: Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "Tela iPhone 13 Pro Max",\n    "price": 1250.00,\n    "cost_price": 750.00,\n    "quantity": 10,\n    "sheet_code": "TEL-13PM"\n  }'`,
      js: `const response = await fetch("https://www.shoppingcell.tech/api/admin/products", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    name: "Tela iPhone 13 Pro Max",\n    price: 1250.00,\n    cost_price: 750.00,\n    quantity: 10,\n    sheet_code: "TEL-13PM"\n  })\n});\nconst data = await response.json();`,
      python: `import requests\n\nurl = "https://www.shoppingcell.tech/api/admin/products"\nheaders = {\n    "Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}",\n    "Content-Type": "application/json"\n}\npayload = {\n    "name": "Tela iPhone 13 Pro Max",\n    "price": 1250.00,\n    "cost_price": 750.00,\n    "quantity": 10,\n    "sheet_code": "TEL-13PM"\n}\nresponse = requests.post(url, headers=headers, json=payload)\nprint(response.json())`,
    },
    get_kpis: {
      title: 'GET /api/admin/kpis',
      desc: 'Retorna métricas em tempo real (Faturamento, Total de Pedidos, Ticket Médio e Produtos com Estoque Baixo).',
      curl: `curl -X GET "https://www.shoppingcell.tech/api/admin/kpis" \\\n  -H "Authorization: Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}"`,
      js: `const res = await fetch("https://www.shoppingcell.tech/api/admin/kpis", {\n  headers: { "Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}" }\n});\nconst kpis = await res.json();`,
      python: `import requests\n\nres = requests.get("https://www.shoppingcell.tech/api/admin/kpis", headers={"Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}"})\nprint(res.json())`,
    },
    sync_sheets: {
      title: 'POST /api/admin/sync-sheets',
      desc: 'Sincroniza produtos e estoque automaticamente a partir da planilha Google Sheets.',
      curl: `curl -X POST "https://www.shoppingcell.tech/api/admin/sync-sheets" \\\n  -H "Authorization: Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}"`,
      js: `const res = await fetch("https://www.shoppingcell.tech/api/admin/sync-sheets", {\n  method: "POST",\n  headers: { "Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}" }\n});\nconst result = await res.json();`,
      python: `import requests\n\nres = requests.post("https://www.shoppingcell.tech/api/admin/sync-sheets", headers={"Authorization": "Bearer ${form.n8n_api_key || 'SUA_CHAVE_API'}"})\nprint(res.json())`,
    },
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Painel</div>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-100">Configurações & Integrações</h1>
          <p className="mt-1 text-sm text-slate-400">
            Personalize a Hero, gerencie a Logo, consulte documentação de APIs e conecte com automações do n8n.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('hero')}
          className={
            'flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition ' +
            (activeTab === 'hero'
              ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/10'
              : 'text-slate-300 hover:bg-white/5')
          }
        >
          <Layout size={16} /> Aparência & Hero
        </button>

        <button
          onClick={() => setActiveTab('apis')}
          className={
            'flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition ' +
            (activeTab === 'apis'
              ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/10'
              : 'text-slate-300 hover:bg-white/5')
          }
        >
          <Terminal size={16} /> Documentação APIs (GET / POST)
        </button>

        <button
          onClick={() => setActiveTab('n8n')}
          className={
            'flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition ' +
            (activeTab === 'n8n'
              ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/10'
              : 'text-slate-300 hover:bg-white/5')
          }
        >
          <Zap size={16} /> Automação n8n & OAuth
        </button>
      </div>

      {/* TAB 1: APARÊNCIA & HERO */}
      {activeTab === 'hero' && (
        <form onSubmit={handleSaveSettings} className="grid gap-6">
          <Panel>
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <ImageIcon size={20} className="text-yellow-400" /> Logo do Site
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Altere o texto da marca e a imagem/SVG da logo exibida no topo do site e do painel.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Texto da Logo
                </label>
                <Input
                  value={form.logo_text}
                  onChange={(e) => setForm({ ...form, logo_text: e.target.value })}
                  placeholder="SHOPPING CELL"
                  className="mt-1.5"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Nome da sua loja exibido no cabeçalho do site.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  URL da Imagem / Ícone da Logo
                </label>
                <Input
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://sualoja.com/logo.png ou /logo.svg"
                  className="mt-1.5"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Link direto da imagem SVG ou PNG. Se vazio, usa a marca em texto com destaque dourado.
                </span>
              </div>

              {/* Logo Preview */}
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950 p-4">
                <div className="text-xs font-semibold text-slate-400">Pré-visualização do Cabeçalho:</div>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-[#07090d] p-3">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo Preview" className="h-8 w-auto object-contain" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 font-black text-black">
                      SC
                    </span>
                  )}
                  <span className="text-sm font-extrabold tracking-tight text-white">
                    {form.logo_text.split(' ')[0]}{' '}
                    <span className="text-amber-400">
                      {form.logo_text.split(' ').slice(1).join(' ') || 'CELL'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <Video size={20} className="text-yellow-400" /> Seção Hero (Página Inicial)
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Ajuste os textos de chamada, vídeo de fundo e WhatsApp comercial.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Título Principal da Hero (H1)
                </label>
                <Input
                  value={form.hero_title}
                  onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
                  placeholder="Peças e Componentes Premium Apple"
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Subtítulo / Descrição da Hero
                </label>
                <textarea
                  rows={3}
                  value={form.hero_subtitle}
                  onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
                  placeholder="Distribuidora oficial para assistências técnicas e lojistas..."
                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  URL do Vídeo de Fundo (MP4)
                </label>
                <Input
                  value={form.hero_video_url}
                  onChange={(e) => setForm({ ...form, hero_video_url: e.target.value })}
                  placeholder="/hero/higgsfield-phone-open.mp4"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Texto do Botão Principal (CTA)
                </label>
                <Input
                  value={form.hero_cta_text}
                  onChange={(e) => setForm({ ...form, hero_cta_text: e.target.value })}
                  placeholder="Ver Catálogo Completo"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  WhatsApp de Atendimento (E.164)
                </label>
                <Input
                  value={form.whatsapp_number}
                  onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                  placeholder="5594992814167"
                  className="mt-1.5"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Formato: Código do País + DDD + Número (ex: 5594992814167).
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
              {saveSuccess ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                  <Check size={16} /> Configurações salvas com sucesso!
                </span>
              ) : (
                <span className="text-xs text-slate-500">Altera as informações da capa do site imediatamente</span>
              )}

              <Button type="submit" disabled={saving}>
                <Save size={16} className="mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </Panel>
        </form>
      )}

      {/* TAB 2: DOCUMENTAÇÃO DE APIS */}
      {activeTab === 'apis' && (
        <div className="grid gap-6">
          <Panel>
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                    <Terminal size={20} className="text-yellow-400" /> Documentação Oficial de APIs REST
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Endpoints para integrar com sistemas externos, ERPs, scripts ou automações.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
                    API Status: Ativa
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Endpoint Selector Buttons */}
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <button
                  onClick={() => setSelectedApi('get_products')}
                  className={
                    'flex flex-col text-left rounded-2xl border p-4 transition ' +
                    (selectedApi === 'get_products'
                      ? 'border-yellow-400/60 bg-yellow-400/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/[0.08]')
                  }
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">GET</span>
                  <span className="mt-1 text-xs font-bold text-slate-100">Listar Produtos</span>
                  <span className="mt-1 text-[11px] text-slate-400">/api/admin/products</span>
                </button>

                <button
                  onClick={() => setSelectedApi('post_product')}
                  className={
                    'flex flex-col text-left rounded-2xl border p-4 transition ' +
                    (selectedApi === 'post_product'
                      ? 'border-yellow-400/60 bg-yellow-400/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/[0.08]')
                  }
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">POST</span>
                  <span className="mt-1 text-xs font-bold text-slate-100">Criar / Editar Produto</span>
                  <span className="mt-1 text-[11px] text-slate-400">/api/admin/products</span>
                </button>

                <button
                  onClick={() => setSelectedApi('get_kpis')}
                  className={
                    'flex flex-col text-left rounded-2xl border p-4 transition ' +
                    (selectedApi === 'get_kpis'
                      ? 'border-yellow-400/60 bg-yellow-400/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/[0.08]')
                  }
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">GET</span>
                  <span className="mt-1 text-xs font-bold text-slate-100">Métricas & KPIs</span>
                  <span className="mt-1 text-[11px] text-slate-400">/api/admin/kpis</span>
                </button>

                <button
                  onClick={() => setSelectedApi('sync_sheets')}
                  className={
                    'flex flex-col text-left rounded-2xl border p-4 transition ' +
                    (selectedApi === 'sync_sheets'
                      ? 'border-yellow-400/60 bg-yellow-400/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/[0.08]')
                  }
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">POST</span>
                  <span className="mt-1 text-xs font-bold text-slate-100">Sync Google Sheets</span>
                  <span className="mt-1 text-[11px] text-slate-400">/api/admin/sync-sheets</span>
                </button>
              </div>

              {/* Active Endpoint Spec */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{apiSnippets[selectedApi].title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{apiSnippets[selectedApi].desc}</p>
                  </div>

                  {/* Format Selector */}
                  <div className="flex rounded-xl border border-white/10 bg-slate-900 p-1">
                    {(['curl', 'js', 'python'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setApiFormat(fmt)}
                        className={
                          'rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ' +
                          (apiFormat === fmt
                            ? 'bg-yellow-400 text-slate-950'
                            : 'text-slate-400 hover:text-white')
                        }
                      >
                        {fmt === 'js' ? 'JavaScript' : fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Box */}
                <div className="relative mt-4">
                  <button
                    onClick={() => copyToClipboard(apiSnippets[selectedApi][apiFormat], 'code')}
                    className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/20"
                  >
                    {copiedKey === 'code' ? (
                      <>
                        <Check size={14} className="text-green-400" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copiar Código
                      </>
                    )}
                  </button>
                  <pre className="overflow-x-auto rounded-xl bg-[#07090d] p-4 text-xs font-mono text-amber-300">
                    {apiSnippets[selectedApi][apiFormat]}
                  </pre>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 3: AUTOMAÇÃO N8N & OAUTH */}
      {activeTab === 'n8n' && (
        <form onSubmit={handleSaveSettings} className="grid gap-6">
          {/* API Key Manager */}
          <Panel>
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <Key size={20} className="text-yellow-400" /> Chave de Autenticação para n8n (API Key)
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Utilize este token no nó `Header Auth` ou `Bearer Auth` do seu workflow no n8n.
              </p>
            </div>

            <div className="p-6">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Chave de Acesso (API Bearer Secret)
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={form.n8n_api_key}
                  onChange={(e) => setForm({ ...form, n8n_api_key: e.target.value })}
                  placeholder="sc_live_..."
                  className="font-mono text-xs text-yellow-300"
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(form.n8n_api_key, 'key')}
                  className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  {copiedKey === 'key' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  {copiedKey === 'key' ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={generateNewApiKey}
                  className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2.5 text-xs font-bold text-yellow-300 hover:bg-yellow-400/20"
                >
                  <RefreshCw size={15} /> Gerar Nova
                </button>
              </div>
            </div>
          </Panel>

          {/* OAuth2 Credentials for n8n */}
          <Panel>
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <LockKeyhole size={20} className="text-yellow-400" opacity={0.9} /> Configuração OAuth2 para n8n
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Para configurar o nó de autenticação OAuth2 no n8n, utilize as URLs oficiais abaixo:
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Authorization URL (n8n OAuth)
                </label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    value="https://www.shoppingcell.tech/api/google/oauth/start"
                    readOnly
                    className="font-mono text-xs text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://www.shoppingcell.tech/api/google/oauth/start', 'auth_url')}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold hover:bg-white/10"
                  >
                    {copiedKey === 'auth_url' ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Access Token URL / Callback (n8n OAuth)
                </label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    value="https://www.shoppingcell.tech/api/google/oauth/callback"
                    readOnly
                    className="font-mono text-xs text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://www.shoppingcell.tech/api/google/oauth/callback', 'token_url')}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold hover:bg-white/10"
                  >
                    {copiedKey === 'token_url' ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Webhooks Destino */}
          <Panel>
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <Webhook size={20} className="text-yellow-400" /> URLs de Webhooks do seu n8n
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Insira as URLs dos Webhooks do seu n8n para onde o sistema enviará eventos automaticamente.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Webhook de Novo Pedido Criado
                </label>
                <Input
                  value={form.n8n_webhook_orders}
                  onChange={(e) => setForm({ ...form, n8n_webhook_orders: e.target.value })}
                  placeholder="https://seu-n8n.com/webhook/orders"
                  className="mt-1.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Webhook de Alerta de Estoque Baixo
                </label>
                <Input
                  value={form.n8n_webhook_stock}
                  onChange={(e) => setForm({ ...form, n8n_webhook_stock: e.target.value })}
                  placeholder="https://seu-n8n.com/webhook/stock-alert"
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
              {saveSuccess ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                  <Check size={16} /> Credenciais salvas com sucesso!
                </span>
              ) : (
                <span className="text-xs text-slate-500">Salva os webhooks para disparo automático</span>
              )}

              <Button type="submit" disabled={saving}>
                <Save size={16} className="mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Configurações do n8n'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </div>
  );
}
