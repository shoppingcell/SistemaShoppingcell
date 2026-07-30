import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileCheck, ShoppingBag, ShieldAlert, Truck, Wrench, Scale } from 'lucide-react';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { SiteHeaderClient } from '@/app/SiteHeaderClient';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Termos de Serviço | Shopping Cell',
  description: 'Condições comerciais e termos de uso do catálogo digital e atendimento da Shopping Cell.',
};

export default function TermosDeServicoPage() {
  const whatsappE164 = (process.env.NEXT_PUBLIC_WHATSAPP_E164 || '5594992814167').replace(/\D/g, '');

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeaderClient logoUrl={SITE_LOGO_URL} />

      {/* Header Banner */}
      <section className="relative overflow-hidden pt-36 pb-16 lg:pt-44 lg:pb-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[450px] w-[800px] -translate-x-1/2 rounded-full bg-amber-400/[0.05] blur-3xl" />
        <div className="relative mx-auto max-w-[1200px] px-5 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-amber-400"
          >
            <ArrowLeft size={14} /> Voltar ao início
          </Link>
          
          <div className="mt-6 flex items-center gap-2">
            <span className="eyebrow">
              <FileCheck size={16} /> Condições Comerciais & Uso
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Termos de Serviço
          </h1>
          <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
            Regras e diretrizes para consulta de catálogo, solicitação de cotação e compra de peças de reposição na Shopping Cell.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-400">
            <span>Última atualização: <strong>29 de Julho de 2026</strong></span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="border-t border-white/[0.08] bg-zinc-950/60 py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px] space-y-10 px-5 lg:px-10">

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <ShoppingBag size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">1. Natureza da Plataforma e Cotações</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                A Shopping Cell disponibiliza um catálogo digital B2B para consulta de disponibilidade de estoque de peças e componentes eletrônicos.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li>O catálogo digital exibe a lista de produtos com finalidade informativa e de montagem de pedidos de cotação.</li>
                <li>A confirmação final de preços, valores de frete, prazos e estoque é realizada diretamente via atendimento humano no WhatsApp comercial.</li>
                <li>Reservamos o direito de ajustar valores e disponibilidade caso ocorram variações de mercado ou atualizações na tabela de fornecedores.</li>
              </ul>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <Wrench size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">2. Garantia e Política de Troca</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                Visando atender a rotina de assistências técnicas e revendedores com segurança, nossas peças possuem garantia contra defeitos de fabricação:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li><strong>Teste pré-instalação:</strong> É responsabilidade do comprador e do técnico responsável testar o componente antes da instalação definitiva na carcaça do aparelho.</li>
                <li><strong>Preservação dos lacres:</strong> A garantia não cobre peças com selos/lacres rompidos, películas removidas, marcas de cola ou danos físicos por má manipulação (cabo flex rasgado, vidro trincado, etc.).</li>
                <li><strong>Envio para troca:</strong> Constatado defeito de fabricação dentro do prazo de garantia acordado, a peça será trocada ou creditada para a próxima compra.</li>
              </ul>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <Truck size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">3. Envio, Prazos e Logística</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                A expedição dos pedidos ocorre mediante confirmação do pagamento e alinhamento com a equipe de atendimento.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li>O prazo de entrega e o valor do frete variam de acordo com o CEP e a modalidade de envio escolhida (Correios SEDEX, PAC ou transportadora parceira).</li>
                <li>O código de rastreamento é informado ao cliente assim que a mercadoria é despachada.</li>
              </ul>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">4. Marcados Registradas e Isenção de Afiliação</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                Apple, iPhone, iPad, Mac e Apple Watch são marcas registradas de titularidade exclusiva de <strong>Apple Inc.</strong>
              </p>
              <p>
                A Shopping Cell é uma empresa fornecedora independente de peças e componentes de reposição e não possui vínculo corporativo, patrocínio ou afiliação oficial direta com a Apple Inc. O uso dos nomes de modelos e marcas no catálogo é estritamente descritivo para identificação de compatibilidade das peças pelos técnicos.
              </p>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <Scale size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">5. Alterações dos Termos e Atendimento</h2>
            </div>
            <div className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                Reservamo-nos o direito de modificar estes Termos de Serviço periodicamente para refletir melhorias no atendimento ou adequações regulatórias. Quaisquer alterações entram em vigor no momento de sua publicação neste endereço eletrônico.
              </p>
              <div className="mt-6">
                <a
                  href={`https://wa.me/${whatsappE164}?text=${encodeURIComponent('Olá! Gostaria de tirar dúvidas sobre os Termos de Serviço da Shopping Cell.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button-primary px-6 py-3.5 text-sm"
                >
                  Falar no WhatsApp <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </article>

        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
