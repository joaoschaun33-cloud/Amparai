import React from "react";
import { Shield, Users, Heart, Phone, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  onOpenSos: () => void;
  onOpenCirculo: () => void;
  onOpenConta: () => void;
  onOpenClinico: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSos,
  onOpenCirculo,
  onOpenConta,
  onOpenClinico,
}) => {
  const { elder } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E6DEC6]">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
        {/* Brand & Elder Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center shadow-xs">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-lg text-[#2D2621] tracking-tight">Amparai</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E8F4F0] text-[#2E7D60]">
                Família
              </span>
            </div>
            <p className="text-xs text-[#786E65]">
              Cuidado com {elder?.name || "Dona Maria"}
            </p>
          </div>
        </div>

        {/* Action Buttons: Círculo, Pasta, Conta & SOS */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-nav-circulo"
            onClick={onOpenCirculo}
            title="Círculo de Cuidado da Família"
            className="p-2.5 rounded-full bg-white text-[#4A423B] border border-[#E6DEC6] hover:bg-[#FAF6F0] hover:text-[#2E7D60] shadow-2xs transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <Users className="w-4 h-4 text-[#2E7D60]" />
            <span className="hidden sm:inline">Círculo</span>
          </button>

          <button
            id="btn-nav-clinico"
            onClick={onOpenClinico}
            title="Pasta de Saúde & Prontuário"
            className="p-2.5 rounded-full bg-white text-[#4A423B] border border-[#E6DEC6] hover:bg-[#FAF6F0] hover:text-[#2E7D60] shadow-2xs transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 text-[#2E7D60]" />
            <span className="hidden sm:inline">Pasta</span>
          </button>

          <button
            id="btn-nav-conta"
            onClick={onOpenConta}
            title="Conta e Privacidade LGPD"
            className="p-2.5 rounded-full bg-white text-[#4A423B] border border-[#E6DEC6] hover:bg-[#FAF6F0] shadow-2xs transition-all"
          >
            <Shield className="w-4 h-4 text-[#786E65]" />
          </button>

          {/* SOS button: Red #A9402E strictly reserved for emergency */}
          <button
            id="btn-sos"
            onClick={onOpenSos}
            title="Botão de Emergência da Família"
            className="px-3.5 py-2 rounded-full bg-[#A9402E] text-white font-bold text-xs shadow-sm hover:bg-[#8D3525] active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 fill-white" />
            <span>SOS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
