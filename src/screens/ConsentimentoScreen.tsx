import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';

export const ConsentimentoScreen: React.FC = () => {
  const { setActiveTab, elder } = useAuth();

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Back button */}
      <button
        onClick={() => setActiveTab('conta')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C6E49] hover:text-[#465538]"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Minha Conta
      </button>

      {/* Main Card */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-[#EAE0D3] pb-4">
          <div className="w-11 h-11 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              LGPD & Segurança
            </span>
            <h2 className="font-display text-xl font-bold text-[#3E2F25] mt-1">
              Privacidade, Consentimento & Proteção de Dados
            </h2>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-[#3E2F25] leading-relaxed">
          <p>
            O <strong>Amparai</strong> foi desenhado desde o primeiro dia com princípios rigorosos de <em>Privacy by Design</em> e conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
          </p>

          <div className="bg-[#F7F0E6] p-4 rounded-xl space-y-2 border border-[#EAE0D3]">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#5C6E49] flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Princípios Inegociáveis do Cuidado
            </h4>
            <ul className="space-y-2 text-xs text-[#6B5A4C]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5C6E49] shrink-0 mt-0.5" />
                <span><strong>Apenas a família e cuidadores autorizados:</strong> Nenhum dado de saúde é aberto ou compartilhado com terceiros.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5C6E49] shrink-0 mt-0.5" />
                <span><strong>Criptografia em trânsito e repouso:</strong> Todas as informações são transmitidas por canais protegidos e armazenadas de forma segura.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5C6E49] shrink-0 mt-0.5" />
                <span><strong>Direito de portabilidade e exclusão:</strong> A qualquer momento o coordenador pode exportar ou solicitar a exclusão de todos os registros da família.</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-[#6B5A4C]">
            Ao utilizar o Amparai para gerenciar a rotina de <strong>{elder?.name || "Helena Schaun"}</strong>, você declara que possui o consentimento da família e a autorização legal para o registro dos cuidados.
          </p>
        </div>

      </section>

    </div>
  );
};
