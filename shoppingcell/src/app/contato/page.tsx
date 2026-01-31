import Link from 'next/link';

export default function ContatoPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_E164;
  const waUrl = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site ShoppingCell e gostaria de um orçamento.')}`
    : '#';

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-slate-200 hover:text-white">
          ← Home
        </Link>

        <h1 className="mt-6 text-3xl font-extrabold">Entre em Contato</h1>
        <p className="mt-2 text-sm text-slate-300">Tem dúvida ou quer orçamento? Fala com a gente.</p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-md bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Chamar no WhatsApp
          </a>

          <div className="mt-6 grid gap-3">
            <label className="text-sm text-slate-200">
              Nome
              <input className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white" placeholder="Seu nome" />
            </label>
            <label className="text-sm text-slate-200">
              Mensagem
              <textarea
                className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
                placeholder="Conte o que você precisa"
                rows={5}
              />
            </label>
            <button
              type="button"
              className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
            >
              Enviar Mensagem
            </button>
            <p className="text-xs text-slate-500">
              (MVP) Esse formulário ainda não envia. Vamos ligar no n8n/telegram/email na próxima etapa.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
