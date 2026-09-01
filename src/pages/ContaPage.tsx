import React, { useState, useEffect } from "react";
import { X, Shield, Lock, MapPin, QrCode, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LocationSettings, ConsentStatus } from "../types";

interface ContaPageProps {
  onClose: () => void;
  onOpenPulseiraPreview: () => void;
}

export const ContaPage: React.FC<ContaPageProps> = ({ onClose, onOpenPulseiraPreview }) => {
  const { authFetch, user, elder, showToast } = useAuth();
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [location, setLocation] = useState<LocationSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const cRes = await authFetch("/api/consentimento/status");
        if (cRes.ok) setConsent(await cRes.json());

        const lRes = await authFetch("/api/elder/location");
        if (lRes.ok) setLocation(await lRes.json());
      } catch {
        // ignore
      }
    }
    load();
  }, [authFetch]);

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authFetch("/api/elder/location", {
        method: "POST",
        body: JSON.stringify(location),
      });
      showToast("Configurações de endereço salvas com segurança!");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      showToast("Erro ao salvar endereço");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div
        id="modal-conta"
        className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#E6DEC6] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E6DEC6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-[#2D2621]">Conta & Privacidade LGPD</h2>
              <p className="text-xs text-[#786E65]">Segurança blindada para sua família</p>
            </div>
          </div>

          <button
            id="btn-close-conta"
            onClick={onClose}
            className="p-2 rounded-full text-[#786E65] hover:bg-[#FAF6F0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 space-y-5">
          {/* User Profile Card */}
          <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#2E7D60] text-white flex items-center justify-center font-bold text-base">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div>
                <p className="font-bold text-base text-[#2D2621]">{user?.name || "Juliana Schaun"}</p>
                <p className="text-xs text-[#786E65]">{user?.email || "juliana@amparai.com.br"}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D60] bg-[#E8F4F0] px-2 py-0.5 rounded-full inline-block mt-1">
                  {user?.role || "Coordenadora Familiar"}
                </span>
              </div>
            </div>
          </div>

          {/* Pulseira QR Code and Privacy */}
          <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#2E7D60]" />
                <div>
                  <h3 className="font-bold text-sm text-[#2D2621]">Pulseira com QR Code (D-004)</h3>
                  <p className="text-xs text-[#786E65]">
                    Página pública blindada: exibe apenas contatos de emergência e alergias críticas.
                  </p>
                </div>
              </div>
              <button
                id="btn-preview-pulseira"
                onClick={onOpenPulseiraPreview}
                className="px-4 py-2 rounded-full bg-white text-[#2E7D60] font-bold text-xs border border-[#E6DEC6] hover:bg-[#FAF6F0] shadow-xs"
              >
                Ver Pulseira
              </button>
            </div>
          </div>

          {/* Geofence & Home Location */}
          <form onSubmit={handleSaveLocation} className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#2E7D60]" />
              <h3 className="font-bold text-sm text-[#2D2621]">Endereço da Residência</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A423B] uppercase mb-1">
                Endereço de {elder?.name || "Dona Maria"}
              </label>
              <input
                id="input-address"
                type="text"
                value={location?.home_address || ""}
                onChange={e => setLocation(prev => ({ ...prev, home_address: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E6DEC6] bg-white text-sm focus:outline-none focus:border-[#2E7D60]"
              />
            </div>

            <button
              id="btn-save-location"
              type="submit"
              className="px-5 py-2 rounded-full bg-[#2E7D60] text-white font-bold text-xs hover:bg-[#23634B] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saved ? "Salvo ✓" : "Salvar Endereço"}</span>
            </button>
          </form>

          {/* LGPD Consent Ledger */}
          <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#2E7D60]" />
              <h3 className="font-bold text-xs uppercase text-[#4A423B] tracking-wider">
                Termo de Consentimento LGPD (D-002)
              </h3>
            </div>
            <p className="text-[#4A423B]">
              Status: <strong className="text-emerald-700">Consentido pela família (Art. 11 LGPD)</strong>
            </p>
            <p className="text-[#786E65]">Versão do Termo: {consent?.term_version || "2026.1"}</p>
            <p className="text-[#786E65]">Data: {consent?.accepted_at || new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
