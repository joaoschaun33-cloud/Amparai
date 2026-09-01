import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Phone, X, ShieldAlert, MapPin, Check } from 'lucide-react';

export const SOSModal: React.FC = () => {
  const { isSosOpen, setIsSosOpen, elder, user } = useAuth();
  const [alertSent, setAlertSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!isSosOpen) return null;

  const handleSendFamilyAlert = async () => {
    setSending(true);
    try {
      await fetch('/api/sos/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elder_id: elder?.id || "helena-schaun",
          triggered_by: user?.name || "Família Schaun",
        }),
      });
      setAlertSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-[#A9402E]">
        
        {/* Header - Red only in SOS */}
        <div className="bg-[#A9402E] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg leading-tight">
                Emergência Rápida
              </h3>
              <p className="text-xs text-white/90">
                Apoio imediato para {elder?.nickname || "a mãe"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsSosOpen(false);
              setAlertSent(false);
            }}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Quick 1-touch SAMU & Emergency Contacts */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B5A4C]">
              Ligar Imediatamente
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="tel:192"
                className="flex items-center justify-center gap-2 p-3 bg-[#A9402E] hover:bg-[#8A3324] text-white rounded-xl font-bold text-sm shadow-sm transition-transform active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>SAMU (192)</span>
              </a>

              <a
                href="tel:193"
                className="flex items-center justify-center gap-2 p-3 bg-[#3E2F25] hover:bg-[#2B2019] text-white rounded-xl font-bold text-sm shadow-sm transition-transform active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Bombeiros (193)</span>
              </a>
            </div>
          </div>

          {/* Quick Family Alert Broadcast */}
          <div className="p-4 bg-[#F7F0E6] rounded-xl border border-[#EAE0D3] space-y-2">
            <h4 className="text-xs font-bold text-[#3E2F25] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#A9402E]" />
              Aviso Imediato no WhatsApp da Família
            </h4>
            <p className="text-xs text-[#6B5A4C] leading-relaxed">
              Dispara uma mensagem de prioridade máxima para todos os filhos e cuidadores com a localização e dados clínicos de urgência.
            </p>

            {alertSent ? (
              <div className="p-2.5 bg-[#EBF0E6] border border-[#8A9E74] text-[#465538] rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-[#5C6E49]" />
                Aviso enviado para todo o círculo!
              </div>
            ) : (
              <button
                onClick={handleSendFamilyAlert}
                disabled={sending}
                className="w-full py-2.5 px-3 bg-[#5C6E49] hover:bg-[#465538] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                {sending ? "Disparando aviso..." : "Disparar Aviso no Círculo"}
              </button>
            )}
          </div>

          {/* Critical Clinical Info */}
          <div className="p-3 bg-[#FFFDF9] rounded-xl border border-[#EAE0D3] space-y-1.5 text-xs text-[#3E2F25]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#6B5A4C]">Tipo Sanguíneo:</span>
              <strong className="text-[#A9402E] font-bold">{elder?.blood_type || "O+"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#6B5A4C]">Alergias:</span>
              <strong className="text-[#A9402E] font-bold">{elder?.allergies?.join(', ') || "Dipirona"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#6B5A4C]">Convênio:</span>
              <span className="font-medium">{elder?.health_insurance || "Bradesco Saúde Top"}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#EAE0D3]">
              <span className="font-semibold text-[#6B5A4C]">Médica:</span>
              <a href={`tel:${elder?.doctor_phone || '(21) 98844-3321'}`} className="text-[#5C6E49] font-bold hover:underline">
                {elder?.doctor_name || "Dra. Cecília (Geriatra)"}
              </a>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 text-xs text-[#6B5A4C] bg-[#F7F0E6] p-2.5 rounded-lg">
            <MapPin className="w-4 h-4 text-[#A9402E] shrink-0" />
            <span>{elder?.address || "Rua das Laranjeiras, 420, Apto 502, Rio de Janeiro - RJ"}</span>
          </div>

        </div>

      </div>
    </div>
  );
};
