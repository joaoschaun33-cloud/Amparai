import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowLeft, Lock, CheckCircle2, AlertCircle, RefreshCw, X, Check } from 'lucide-react';

export const ConsentimentoScreen: React.FC = () => {
  const { setActiveTab, elder } = useAuth();
  const [consentStatus, setConsentStatus] = useState<any>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/consentimento/status');
      if (res.ok) {
        const data = await res.json();
        setConsentStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRevokeConsent = async () => {
    setIsRevoking(true);
    try {
      const res = await fetch('/api/consentimento/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason || "Revogação solicitada pelo coordenador." }),
      });
      if (res.ok) {
        setRevokeSuccess(true);
        await fetchStatus();
        setTimeout(() => {
          setShowRevokeModal(false);
          setRevokeReason('');
          setRevokeSuccess(false);
        }, 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRevoking(false);
    }
  };

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
        <div className="flex items-center justify-between border-b border-[#EAE0D3] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                LGPD & Segurança
              </span>
              <h2 className="font-display text-xl font-bold text-[#3E2F25] mt-1">
                Privacidade & Termo de Consentimento
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-[#EBF0E6] text-[#465538] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#8A9E74]/30">
              {consentStatus?.status === 'revoked' ? 'Revogado' : 'Termo v1.0 Ativo'}
            </span>
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
                <span><strong>Direito de portabilidade e exclusão:</strong> A qualquer momento o titular pode exportar seus dados ou solicitar a exclusão definitiva.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5C6E49] shrink-0 mt-0.5" />
                <span><strong>Pulseira com Minimização Estrita (D-004):</strong> A leitura pública do QR code não expõe prontuários, apenas o primeiro nome e contatos de emergência.</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-[#EAE0D3] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#6B5A4C]">
                Cuidado registrado para: <strong>{elder?.name || "Helena Schaun"}</strong>
              </p>
              <span className="text-[10px] text-[#A89B8F]">
                Log de aceite imutável gravado para conformidade legal (Art. 11 LGPD).
              </span>
            </div>

            {consentStatus?.status !== 'revoked' && (
              <button
                type="button"
                onClick={() => setShowRevokeModal(true)}
                className="text-xs font-bold text-[#A9402E] hover:bg-[#A9402E]/10 px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto border border-[#A9402E]/30"
              >
                Revogar Consentimento
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#A9402E]">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-[#3E2F25]">Revogar Consentimento</h3>
              </div>
              <button
                onClick={() => setShowRevokeModal(false)}
                className="p-1 rounded-lg hover:bg-[#F7F0E6] text-[#6B5A4C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {revokeSuccess ? (
              <div className="p-4 bg-[#EBF0E6] text-[#465538] rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-[#5C6E49]" />
                <span>Consentimento revogado com sucesso. O processamento operacional foi pausado.</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#6B5A4C] leading-relaxed">
                  Ao revogar o consentimento, os dados de saúde não serão mais atualizados no aplicativo para sua família. O registro imutável do consentimento anterior permanecerá arquivado para cumprimento de obrigação legal.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3E2F25] block">
                    Motivo da revogação (opcional):
                  </label>
                  <input
                    type="text"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Ex: Mudança na rotina de cuidados"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#A9402E]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRevokeModal(false)}
                    className="text-xs font-semibold px-4 py-2 rounded-xl text-[#6B5A4C] hover:bg-[#F7F0E6]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isRevoking}
                    onClick={handleRevokeConsent}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-[#A9402E] hover:bg-[#8F3525] text-white disabled:opacity-40 transition-all shadow-xs"
                  >
                    {isRevoking ? "Revogando..." : "Confirmar Revogação"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
