import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Download, Bell } from 'lucide-react';

export const ContaScreen: React.FC = () => {
  const { user, elder, setActiveTab } = useAuth();

  const handleExportData = () => {
    const data = {
      user,
      elder,
      exported_at: new Date().toISOString(),
      platform: "Amparai Web",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `amparai-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
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
              <p className="text-xs text-[#6B5A4C]">Bases legais, dados protegidos e direitos da família</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#5C6E49]">Ver</span>
        </button>

        {/* Exportar dados LGPD */}
        <button
          onClick={handleExportData}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F7F0E6] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7F0E6] text-[#3E2F25] flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#3E2F25]">Exportar Meus Dados</h4>
              <p className="text-xs text-[#6B5A4C]">Baixar cópia em formato JSON (Portabilidade LGPD)</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#5C6E49]">Baixar</span>
        </button>

        {/* Notificações e Lembretes */}
        <div className="p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7F0E6] text-[#3E2F25] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#3E2F25]">Notificações do Círculo</h4>
              <p className="text-xs text-[#6B5A4C]">Lembretes de remédios e avisos importantes</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#5C6E49] bg-[#EBF0E6] px-2.5 py-1 rounded-full">Ativas</span>
        </div>

      </section>

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
