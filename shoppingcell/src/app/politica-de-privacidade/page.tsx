import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Lock, ShieldCheck, UserCheck, Eye, FileText, HelpCircle } from 'lucide-react';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { SiteHeaderClient } from '@/app/SiteHeaderClient';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Shopping Cell',
  description: 'Saiba como a Shopping Cell coleta, utiliza e protege os seus dados pessoais em conformidade com a LGPD.',
};

export default function PoliticaDePrivacidadePage() {
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
              <ShieldCheck size={16} /> Transparência & Segurança
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Política de Privacidade
          </h1>
          <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
            Entenda como tratamos os seus dados no catálogo digital e nos atendimentos comerciais da Shopping Cell, seguindo a Lei Geral de Proteção de Dados (LGPD).
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
              <Eye size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">1. Informações que Coletamos</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                A Shopping Cell atua na revenda B2B de peças e acessórios Apple para assistências técnicas e lojistas. Para prestar atendimento comercial, podemos coletar os seguintes dados pessoais e empresariais:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li><strong>Dados de identificação e contato:</strong> Nome completo, telefone/WhatsApp, endereço de e-mail e nome da empresa ou assistência técnica.</li>
                <li><strong>Dados de cotação e pedidos:</strong> Lista de peças solicitadas, preferências de entrega e histórico de cotações via WhatsApp.</li>
                <li><strong>Dados de navegação técnica:</strong> Endereço IP, tipo de navegador, sistema operacional e páginas acessadas para fins de segurança e otimização do catálogo.</li>
              </ul>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <FileText size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">2. Finalidade do Tratamento de Dados</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>Tratamos seus dados estritamente para as seguintes finalidades legítimas:</p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li>Responder a solicitações de orçamentos e cotações de estoque;</li>
                <li>Processar e acompanhar pedidos de compra e envios logísticos;</li>
                <li>Confirmar a autenticidade do cadastro comercial de assistências e revendedores;</li>
                <li>Enviar atualizações sobre o catálogo, aviso de reposição de estoque relevante ou comunicados importantes da loja;</li>
                <li>Cumprir obrigações legais, fiscais e regulatórias.</li>
              </ul>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <Lock size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">3. Compartilhamento e Proteção de Dados</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                <strong>Não vendemos nem alugamos seus dados pessoais a terceiros sob nenhuma hipótese.</strong>
              </p>
              <p>
                O compartilhamento ocorre exclusivamente com parceiros tecnológicos e logísticos estritamente necessários para a operação do serviço, tais como:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li><strong>Provedores de Infraestrutura de Nuvem:</strong> Supabase e Vercel para armazenamento seguro dos dados sob criptografia SSL/TLS.</li>
                <li><strong>Transportadoras e Correios:</strong> Para envio e entrega dos pedidos com código de rastreamento.</li>
              </ul>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <UserCheck size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">4. Seus Direitos como Titular (LGPD)</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você possui o direito de:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li>Confirmar a existência de tratamento dos seus dados;</li>
                <li>Acessar ou solicitar cópia das informações cadastradas;</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                <li>Solicitar a eliminação ou anonimização de dados desnecessários.</li>
              </ul>
              <p className="pt-2">
                Para exercer qualquer um dos seus direitos, basta entrar em contato com nossa equipe pelo canal de atendimento indicado ao final desta página.
              </p>
            </div>
          </article>

          <article className="surface p-8 sm:p-10">
            <div className="flex items-center gap-3 text-amber-400">
              <HelpCircle size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">5. Fale com a Nossa Equipe</h2>
            </div>
            <div className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
              <p>
                Se você tiver dúvidas sobre nossa Política de Privacidade ou sobre como tratamos suas informações, entre em contato direto pelo WhatsApp de atendimento comercial.
              </p>
              <div className="mt-6">
                <a
                  href={`https://wa.me/${whatsappE164}?text=${encodeURIComponent('Olá! Tenho dúvidas sobre a Política de Privacidade da Shopping Cell.')}`}
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
