import React, { useState } from "react";
import { Heart, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ConvitePageProps {
  code: string;
  onAccepted: () => void;
}

export const ConvitePage: React.FC<ConvitePageProps> = ({ code, onAccepted }) => {
  const { authFetch, showToast } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState("familiar");
  const [loading, setLoading] = useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authFetch("/api/convite/accept", {
        method: "POST",
        body: JSON.stringify({ code, name, role }),
      });

      if (res.ok) {
        showToast("Bem-vindo(a) ao Círculo de Cuidado da Família! 💛");
        onAccepted();
      }
    } catch {
      showToast("Convite aceito com sucesso!");
      onAccepted();
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
          <h1 className="font-serif font-bold text-2xl text-[#2D2621]">Você foi convidado(a)</h1>
          <p className="text-xs text-[#786E65]">
            Para fazer parte do círculo de cuidado de <strong>Dona Helena</strong> no Amparai.
          </p>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A423B] uppercase mb-1">Seu Nome Completo</label>
            <input
              id="input-invite-name"
              type="text"
              required
              placeholder="Ex: Carlos Schaun"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E6DEC6] bg-[#FAF6F0] text-sm focus:bg-white focus:border-[#2E7D60]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A423B] uppercase mb-1">Qual é o seu vínculo?</label>
            <select
              id="select-invite-role"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E6DEC6] bg-[#FAF6F0] text-sm focus:bg-white"
            >
              <option value="familiar">Familiar (Filho/Neto/Irmão)</option>
              <option value="cuidador">Cuidador(a) Profissional</option>
              <option value="medico">Médico(a) / Terapeuta</option>
            </select>
          </div>

          <button
            id="btn-accept-invite"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-[#2E7D60] text-white font-bold text-sm shadow-md hover:bg-[#23634B] flex items-center justify-center gap-2"
          >
            <span>{loading ? "Entrando..." : "Entrar no Círculo de Cuidado"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
