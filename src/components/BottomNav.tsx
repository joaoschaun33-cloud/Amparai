import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sun, Calendar, Heart, Wallet, AlertCircle } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setIsSosOpen } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#EAE0D3]">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around relative">
        
        {/* Tab 1: Hoje */}
        <button
          onClick={() => setActiveTab('hoje')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'hoje' ? 'text-[#5C6E49] font-bold' : 'text-[#6B5A4C] hover:text-[#3E2F25]'
          }`}
        >
          <Sun className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Hoje</span>
        </button>

        {/* Tab 2: Escala */}
        <button
          onClick={() => setActiveTab('escala')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'escala' ? 'text-[#5C6E49] font-bold' : 'text-[#6B5A4C] hover:text-[#3E2F25]'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Escala</span>
        </button>

        {/* Central SOS Button (#A9402E ONLY on Emergency) */}
        <div className="relative -top-3 flex flex-col items-center">
          <button
            onClick={() => setIsSosOpen(true)}
            aria-label="Botão de Emergência SOS"
            className="w-12 h-12 rounded-full bg-[#A9402E] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-[#A9402E]/30"
          >
            <AlertCircle className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#A9402E] mt-0.5">
            SOS
          </span>
        </div>

        {/* Tab 3: Saúde */}
        <button
          onClick={() => setActiveTab('saude')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'saude' ? 'text-[#5C6E49] font-bold' : 'text-[#6B5A4C] hover:text-[#3E2F25]'
          }`}
        >
          <Heart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Saúde</span>
        </button>

        {/* Tab 4: Custos */}
        <button
          onClick={() => setActiveTab('custos')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'custos' ? 'text-[#5C6E49] font-bold' : 'text-[#6B5A4C] hover:text-[#3E2F25]'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Custos</span>
        </button>

      </div>
    </nav>
  );
};
