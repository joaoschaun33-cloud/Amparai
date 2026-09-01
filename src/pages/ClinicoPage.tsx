import React, { useState, useEffect } from "react";
import { X, FileText, Heart, Shield, Stethoscope, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ClinicalData } from "../types";

interface ClinicoPageProps {
  onClose: () => void;
}

export const ClinicoPage: React.FC<ClinicoPageProps> = ({ onClose }) => {
  const { authFetch, elder, showToast } = useAuth();
  const [data, setData] = useState<ClinicalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch("/api/clinico");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authFetch]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div
        id="modal-clinico"
        className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#E6DEC6] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E6DEC6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-[#2D2621]">Pasta de Saúde & MedBag</h2>
              <p className="text-xs text-[#786E65]">Prontuário completo de {elder?.name || "Dona Maria"}</p>
            </div>
          </div>

          <button
            id="btn-close-clinico"
            onClick={onClose}
            className="p-2 rounded-full text-[#786E65] hover:bg-[#FAF6F0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 space-y-4">
          {/* Quick Vital Info Card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6]">
              <span className="text-[10px] uppercase font-bold text-[#786E65] block">Tipo Sanguíneo</span>
              <span className="font-serif font-bold text-xl text-[#2E7D60] mt-0.5 block">
                {data?.blood_type || "O+"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6]">
              <span className="text-[10px] uppercase font-bold text-[#786E65] block">Mobilidade</span>
              <span className="font-bold text-sm text-[#2D2621] mt-1 block">
                {data?.mobility || "Independente c/ apoio"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-[#786E65] block">Cognição</span>
              <span className="font-bold text-sm text-[#2D2621] mt-1 block">
                {data?.cognitive || "Lúcida e comunicativa"}
              </span>
            </div>
          </div>

          {/* Allergies & Conditions */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-700" />
              <h3 className="font-bold text-xs uppercase text-rose-800 tracking-wider">Alergias Importantes</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {data?.allergies?.map((a, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-white text-rose-800 font-bold text-xs border border-rose-300"
                >
                  {a}
                </span>
              ))}
              {(!data?.allergies || data.allergies.length === 0) && (
                <span className="text-xs text-rose-700">Nenhuma alergia medicamentosa informada.</span>
              )}
            </div>
          </div>

          {/* Health Insurance & Doctor */}
          <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2E7D60]" />
              <h3 className="font-bold text-xs uppercase text-[#4A423B] tracking-wider">Convênio e Plano</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#786E65]">Operadora:</p>
                <p className="font-bold text-sm text-[#2D2621]">{data?.health_plan?.name || "Bradesco Saúde Top"}</p>
              </div>
              <div>
                <p className="text-[#786E65]">Número da Carteirinha:</p>
                <p className="font-bold text-sm text-[#2D2621]">{data?.health_plan?.card_number || "982.341.002.88"}</p>
              </div>
            </div>
          </div>

          {/* Clinical Directives */}
          <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6]">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-[#2E7D60]" />
              <h3 className="font-bold text-xs uppercase text-[#4A423B] tracking-wider">
                Diretrizes de Cuidado & Preferências
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#4A423B] leading-relaxed">
              {data?.notes ||
                "Dona Helena gosta de tomar sol de manhã no jardim. Preferência por refeições em porções menores. Evitar conversas agitadas após as 20h para preservar o sono reparador."}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E6DEC6] flex justify-end">
          <button
            onClick={() => {
              showToast("Prontuário pronto para apresentar em consultas.");
              onClose();
            }}
            className="px-6 py-2.5 rounded-full bg-[#2E7D60] text-white font-bold text-xs hover:bg-[#23634B]"
          >
            Fechar Pasta
          </button>
        </div>
      </div>
    </div>
  );
};
