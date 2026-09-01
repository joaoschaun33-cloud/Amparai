import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Download, Bell, Trash2, AlertTriangle, Check, X, Sparkles } from 'lucide-react';
import { PlanosSection } from '../components/PlanosSection';

export const ContaScreen: React.FC = () => {
  const { user, elder, setActiveTab, refreshData } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `amparai-dados-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Erro na exportação de dados:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccountData = async () => {
    if (confirmText !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/account/data', { method: 'DELETE' });
      if (res.ok) {
        setDeleteSuccess(true);
        setTimeout(async () => {
          setShowDeleteModal(false);
          setConfirmText('');
          await refreshData();
          setActiveTab('hoje');
        }, 2500);
      }
    } catch (e) {
      console.error("Erro na exclusão de dados:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* User Profile Card */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#5C6E49] text-white font-display text-xl font-bold flex items-center justify-center shadow-xs">
            {user?.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[#3E2F25]">{user?.name}</h2>
            <p className="text-xs text-[#6B5A4C]">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                Papel: {user?.role || "Coordenador"}
              </span>
              <span className="text-[11px] text-[#6B5A4C]">
                Cuidando de <strong>{elder?.nickname || "Dona Helena"}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Planos & Assinatura Familiar (Onda 4) */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm">
        <PlanosSection />
      </section>

      {/* Settings Options */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl divide-y divide-[#EAE0D3] overflow-hidden">
        
        {/* Termos de Privacidade e Consentimento LGPD */}
        <button
          onClick={() => setActiveTab('consentimento')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F7F0E6] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#3E2F25]">Privacidade & Consentimento LGPD</h4>
              <p className="text-xs text-[#6B5A4C]">Bases legais, dados protegidos e termo oficial v1.0</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#5C6E49]">Ver</span>
        </button>

        {/* Exportar dados LGPD */}
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F7F0E6] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7F0E6] text-[#3E2F25] flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#3E2F25]">Exportar Meus Dados</h4>
              <p className="text-xs text-[#6B5A4C]">Baixar arquivo completo em JSON (Portabilidade Art. 18 LGPD)</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#5C6E49]">{isExporting ? "Gerando..." : "Baixar"}</span>
        </button>

        {/* Notificações e Lembretes */}
        <div className="p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7F0E6] text-[#3E2F25] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#3E2F25]">Notificações do Círculo</h4>
              <p className="text-xs text-[#6B5A4C]">Lembretes de remédios e recados no diário</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#5C6E49] bg-[#EBF0E6] px-2.5 py-1 rounded-full">Ativas</span>
        </div>

        {/* Excluir Dados / Direito ao Esquecimento */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#A9402E]/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#A9402E]/10 text-[#A9402E] flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#A9402E]">Excluir Meus Dados</h4>
              <p className="text-xs text-[#6B5A4C]">Direito à eliminação de dados conforme Art. 18 da LGPD</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#A9402E]">Gerenciar</span>
        </button>

      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#A9402E]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-[#3E2F25]">Exclusão de Dados (LGPD)</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 rounded-lg hover:bg-[#F7F0E6] text-[#6B5A4C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteSuccess ? (
              <div className="p-4 bg-[#EBF0E6] text-[#465538] rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-[#5C6E49]" />
                <span>Dados operacionais excluídos com sucesso. Registros legais imutáveis arquivados.</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#6B5A4C] leading-relaxed">
                  Esta ação excluirá permanentemente todos os registros operacionais (remédios, notas, histórico de rotina e custos). Conforme a legislação, o registro de consentimento original será mantido imutável por 5 anos para fins de conformidade legal.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3E2F25] block">
                    Digite <span className="text-[#A9402E] font-mono">EXCLUIR</span> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#A9402E]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="text-xs font-semibold px-4 py-2 rounded-xl text-[#6B5A4C] hover:bg-[#F7F0E6]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={confirmText !== 'EXCLUIR' || isDeleting}
                    onClick={handleDeleteAccountData}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-[#A9402E] hover:bg-[#8F3525] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Amparai Mission Statement */}
      <div className="p-5 rounded-2xl bg-[#5C6E49] text-white space-y-2 text-center">
        <h3 className="font-display font-bold text-lg text-white">Amparai</h3>
        <p className="text-xs text-white/90 max-w-md mx-auto leading-relaxed">
          A tecnologia fica invisível; o carinho, no centro. Organizando o cuidado da mãe de forma calma, sem cobranças e sem sustos.
        </p>
        <span className="text-[10px] text-white/70 block pt-1">Versão 1.0.0 • Amparai Web</span>
      </div>

    </div>
  );
};
