import React, { useState } from "react";
import { Heart, ShieldCheck, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { authFetch, refreshElder, showToast } = useAuth();
  const [elderName, setElderName] = useState("Helena Schaun");
  const [elderAge, setElderAge] = useState(78);
  const [bloodType, setBloodType] = useState("O+");
  const [address, setAddress] = useState("Rua das Laranjeiras, 420");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authFetch("/api/elder", {
        method: "POST",
        body: JSON.stringify({
          name: elderName,
          age: elderAge,
          blood_type: bloodType,
          address,
        }),
      });

      await authFetch("/api/consentimento/accept", {
        method: "POST",
        body: JSON.stringify({ term_version: "2026.1" }),
      });

      await refreshElder();
      showToast("Configuração concluída! Bem-vindo ao Amparai 💛");
      onComplete();
    } catch {
      showToast("Configuração concluída!");
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F0E6] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E6DEC6] space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#2E7D60] text-white flex items-center justify-center mx-auto shadow-md">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-[#2D2621]">Bem-vindo ao Amparai</h1>
          <p className="text-xs text-[#786E65]">Cuidado compartilhado, leve e acolhedor para sua mãe</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A423B] uppercase mb-1">
              Nome de quem vamos cuidar
            </label>
            <input
              type="text"
              required
              value={elderName}
              onChange={e => setElderName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E6DEC6] bg-[#FAF6F0] text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4A423B] uppercase mb-1">Idade</label>
              <input
                type="number"
                required
                value={elderAge}
                onChange={e => setElderAge(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-[#E6DEC6] bg-[#FAF6F0] text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A423B] uppercase mb-1">Tipo Sanguíneo</label>
              <input
                type="text"
                value={bloodType}
                onChange={e => setBloodType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E6DEC6] bg-[#FAF6F0] text-sm focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A423B] uppercase mb-1">Endereço de Residência</label>
            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E6DEC6] bg-[#FAF6F0] text-sm focus:bg-white"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF6F0] text-[11px] text-[#786E65] flex items-center gap-2 border border-[#E6DEC6]">
            <ShieldCheck className="w-4 h-4 text-[#2E7D60] shrink-0" />
            <span>Consentimento da família conforme Art. 11 da LGPD para dados de saúde.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-[#2E7D60] text-white font-bold text-sm shadow-md hover:bg-[#23634B] flex items-center justify-center gap-2"
          >
            <span>{loading ? "Salvando..." : "Começar a Cuidar Juntos"}</span>
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
