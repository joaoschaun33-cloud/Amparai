import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Users } from 'lucide-react';

export const Header: React.FC = () => {
  const { elder, user, activeTab, setActiveTab } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#EAE0D3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand & Elder Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('hoje')}>
            <div className="w-8 h-8 rounded-xl bg-[#5C6E49] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs">
              A
            </div>
            <span className="font-display font-bold text-lg text-[#3E2F25] tracking-tight">
              Amparai
            </span>
          </div>

          <div className="h-4 w-px bg-[#EAE0D3] hidden sm:block" />

          <button
            onClick={() => setActiveTab('clinico')}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EBF0E6] hover:bg-[#8A9E74]/30 border border-[#8A9E74]/30 text-xs text-[#3E2F25] transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-[#5C6E49] animate-pulse" />
            <span className="font-semibold text-[#465538]">
              {elder?.nickname || elder?.name || "Dona Helena"}
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('circulo')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'circulo'
                ? 'bg-[#5C6E49] text-white'
                : 'text-[#6B5A4C] hover:bg-[#F7F0E6]'
            }`}
            title="Círculo de Cuidado"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Círculo</span>
          </button>

          <button
            onClick={() => setActiveTab('conta')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'conta'
                ? 'bg-[#5C6E49] text-white'
                : 'text-[#6B5A4C] hover:bg-[#F7F0E6]'
            }`}
            title="Minha Conta"
          >
            <div className="w-5 h-5 rounded-full bg-[#EAE0D3] text-[#3E2F25] text-[10px] font-bold flex items-center justify-center">
              {user?.name.slice(0, 1) || 'U'}
            </div>
            <span className="hidden sm:inline font-medium">{user?.name.split(' ')[0]}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
