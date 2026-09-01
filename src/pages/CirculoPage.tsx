import React, { useState, useEffect } from "react";
import { X, Users, Phone, Copy, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Member } from "../types";

interface CirculoPageProps {
  onClose: () => void;
}

export const CirculoPage: React.FC<CirculoPageProps> = ({ onClose }) => {
  const { authFetch, elder, showToast } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch("/api/circulo");
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
        }

        const invRes = await authFetch("/api/convite/create", { method: "POST" });
        if (invRes.ok) {
          const d = await invRes.json();
          setInviteUrl(`${window.location.origin}/convite/${d.code}`);
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [authFetch]);

  const copyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      showToast("Link de convite copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div
        id="modal-circulo"
        className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#E6DEC6] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E6DEC6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-[#2D2621]">Círculo de Cuidado da Família</h2>
              <p className="text-xs text-[#786E65]">Todos que apoiam o dia a dia de {elder?.name || "Dona Maria"}</p>
            </div>
          </div>

          <button
            id="btn-close-circulo"
            onClick={onClose}
            className="p-2 rounded-full text-[#786E65] hover:bg-[#FAF6F0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite link banner */}
        <div className="my-5 p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-xs uppercase text-[#4A423B] tracking-wider">Convidar Familiar ou Cuidador</h3>
            <p className="text-xs text-[#786E65] mt-0.5">Envie o link seguro para incluir irmãos na rotina</p>
          </div>

          <button
            id="btn-copy-invite"
            onClick={copyInvite}
            className="px-4 py-2.5 rounded-full bg-[#2E7D60] text-white font-bold text-xs hover:bg-[#23634B] flex items-center gap-1.5 shadow-xs"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copiado ✓" : "Copiar Link de Convite"}</span>
          </button>
        </div>

        {/* Members list */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base text-[#2D2621]">Membros do Círculo</h3>

          {members.map(m => (
            <div
              key={m.id}
              className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center font-bold text-sm">
                  {m.avatar || m.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#2D2621]">{m.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#2E7D60] font-bold border border-[#E6DEC6]">
                      {m.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#786E65] mt-0.5">{m.phone || "Sem telefone"}</p>
                </div>
              </div>

              {m.phone && (
                <a
                  href={`tel:${m.phone.replace(/\D/g, "")}`}
                  className="p-2.5 rounded-full bg-white border border-[#E6DEC6] text-[#2E7D60] hover:bg-[#FAF6F0]"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
