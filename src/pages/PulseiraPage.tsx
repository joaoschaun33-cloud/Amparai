import React, { useState, useEffect } from "react";
import { Phone, ArrowLeft, Heart, Shield, AlertTriangle } from "lucide-react";

interface PulseiraPageProps {
  elderId: string;
  onBackToApp?: () => void;
}

export const PulseiraPage: React.FC<PulseiraPageProps> = ({ elderId, onBackToApp }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/pulseira/${elderId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [elderId]);

  return (
    <div className="min-h-screen bg-[#F7F0E6] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E6DEC6] space-y-6">
        {/* Top bar with emergency badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#2E7D60] text-white flex items-center justify-center">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <span className="font-serif font-bold text-lg text-[#2D2621]">Amparai</span>
          </div>

          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Emergência
          </span>
        </div>

        {/* Reassuring identification banner */}
        <div className="text-center py-2 border-b border-[#E6DEC6]">
          <h1 className="font-serif font-bold text-2xl text-[#2D2621]">
            {data?.first_name ? `Olá, sou ${data.first_name}` : "Identificação de Emergência"}
          </h1>
          <p className="text-xs text-[#786E65] mt-1">
            Se você me encontrou ou estou precisando de ajuda, por favor ligue para minha família abaixo:
          </p>
        </div>

        {/* Emergency Contacts */}
        <div className="space-y-3">
          <h2 className="font-bold text-xs uppercase text-[#4A423B] tracking-wider">Ligue para a Família</h2>

          {data?.emergency_contacts?.map((c: any, i: number) => (
            <a
              key={i}
              id={`btn-call-emergency-${i}`}
              href={`tel:${c.phone ? c.phone.replace(/\D/g, "") : ""}`}
              className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex items-center justify-between hover:bg-[#F3ECE0] transition-colors"
            >
              <div>
                <p className="font-bold text-base text-[#2D2621]">{c.name}</p>
                <p className="text-xs text-[#786E65]">{c.relation} • {c.phone}</p>
              </div>

              <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center shadow-xs">
                <Phone className="w-5 h-5 fill-white" />
              </div>
            </a>
          ))}
        </div>

        {/* Critical Allergies if any */}
        {data?.critical_allergies && data.critical_allergies.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs">
            <p className="font-bold text-rose-800 uppercase tracking-wider mb-1">Alergias Críticas:</p>
            <p className="text-rose-900 font-semibold">{data.critical_allergies.join(", ")}</p>
          </div>
        )}

        {/* LGPD Safety Notice */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6F0] text-[11px] text-[#786E65] flex items-center gap-2 border border-[#E6DEC6]">
          <Shield className="w-4 h-4 text-[#2E7D60] shrink-0" />
          <span>Informações públicas seguras de identificação sob a norma LGPD (D-004).</span>
        </div>

        {onBackToApp && (
          <button
            id="btn-back-to-app"
            onClick={onBackToApp}
            className="w-full py-3 rounded-full bg-white text-[#4A423B] font-bold text-xs border border-[#E6DEC6] hover:bg-[#FAF6F0] flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao App Amparai</span>
          </button>
        )}
      </div>
    </div>
  );
};
