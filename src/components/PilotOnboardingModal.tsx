import React from 'react';
import { Sparkles, Heart, ShieldCheck, Calendar, Users, X, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PilotOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PilotOnboardingModal: React.FC<PilotOnboardingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-[#EAE0D3] pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#EBF0E6] text-[#465538] text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5C6E49]" /> Piloto Fechado de Famílias
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#F7F0E6] text-[#6B5A4C]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Introduction */}
        <div className="space-y-1.5">
          <h3 className="font-display text-2xl font-bold text-[#3E2F25]">
            Bem-vindo ao Amparai
          </h3>
          <p className="text-xs sm:text-sm text-[#6B5A4C] leading-relaxed">
            Criado para que filhos, netos e cuidadores cuidem da mãe com paz de espírito, transparência e sem ruídos no WhatsApp.
          </p>
        </div>

        {/* 3 Pillars for the Pilot Family */}
        <div className="space-y-3">
          <div className="p-3.5 bg-white rounded-2xl border border-[#EAE0D3] flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-[#FFF9F0] text-[#C4633F] flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-[#C4633F]/20" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#3E2F25]">1. Rotina & Remédios em Tempo Real</h4>
              <p className="text-xs text-[#6B5A4C] mt-0.5">
                Quem estiver com a mãe confirma os medicamentos. Todo o círculo recebe um aviso suave na hora.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-[#EAE0D3] flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#3E2F25]">2. Escala Justa e sem Sobrecarga</h4>
              <p className="text-xs text-[#6B5A4C] mt-0.5">
                Divida os dias e plantões entre os familiares e cuidadores sem esquecimentos.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-[#EAE0D3] flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-[#F0EBF5] text-[#6E4975] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#3E2F25]">3. Pasta de Saúde & SOS Seguro</h4>
              <p className="text-xs text-[#6B5A4C] mt-0.5">
                Receitas e laudos organizados para levar às consultas e botão de emergência pronto a um toque.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#A89B8F]">
            Privacidade total conforme a LGPD
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#5C6E49] hover:bg-[#465538] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            Começar a Usar <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
