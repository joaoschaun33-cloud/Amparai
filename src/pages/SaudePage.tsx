import React, { useState, useEffect } from "react";
import { Plus, Activity, Mic, Eye, Stethoscope, Pill, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { HealthEvent, Medication } from "../types";

interface SaudePageProps {
  onOpenAddModal: () => void;
  onOpenClinico: () => void;
}

export const SaudePage: React.FC<SaudePageProps> = ({ onOpenAddModal, onOpenClinico }) => {
  const { authFetch } = useAuth();
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const loadSaude = async () => {
    try {
      const res = await authFetch("/api/saude");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setMeds(data.medications || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSaude();
  }, []);

  const filteredEvents = events.filter(e => {
    if (filter === "all") return true;
    return e.kind === filter;
  });

  const getEventIcon = (kind: string) => {
    switch (kind) {
      case "pressao":
        return <Activity className="w-4 h-4 text-[#2E7D60]" />;
      case "audio":
        return <Mic className="w-4 h-4 text-[#D97706]" />;
      case "consulta":
        return <Stethoscope className="w-4 h-4 text-sky-700" />;
      case "observacao":
      default:
        return <Eye className="w-4 h-4 text-purple-700" />;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header with MedBag Badge */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-serif font-bold text-2xl text-[#2D2621]">Linha de Saúde</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4F0] text-[#2E7D60] font-bold text-xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              MedBag Incluso
            </span>
          </div>
          <p className="text-xs text-[#786E65]">
            Histórico contínuo e acolhedor para acompanhamento em consultas
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-open-pasta-saude"
            onClick={onOpenClinico}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-[#FAF6F0] text-[#2D2621] font-bold text-xs border border-[#E6DEC6] hover:bg-white"
          >
            Pasta de Saúde
          </button>
          <button
            id="btn-add-saude"
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-[#2E7D60] text-white font-bold text-xs shadow-sm hover:bg-[#23634B] flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "all", label: "Todos os Registros" },
          { id: "pressao", label: "Pressão Arterial" },
          { id: "audio", label: "Áudios & Recados" },
          { id: "observacao", label: "Observações" },
          { id: "consulta", label: "Consultas" },
        ].map(item => (
          <button
            key={item.id}
            id={`filter-saude-${item.id}`}
            onClick={() => setFilter(item.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
              filter === item.id
                ? "bg-[#2E7D60] text-white border-[#2E7D60]"
                : "bg-white text-[#4A423B] border-[#E6DEC6] hover:bg-[#FAF6F0]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Health Events Timeline */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <h2 className="font-serif font-bold text-lg text-[#2D2621] mb-4">Acontecimentos Recentes</h2>

        <div className="space-y-4 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E6DEC6]">
          {filteredEvents.map(evt => (
            <div key={evt.id} id={`health-event-${evt.id}`} className="relative pl-10">
              <div className="absolute left-3 -translate-x-1/2 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-[#2E7D60] flex items-center justify-center shadow-xs">
                {getEventIcon(evt.kind || "observacao")}
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-[#2D2621]">{evt.title}</h3>
                  <span className="text-[11px] text-[#786E65]">{evt.when}</span>
                </div>

                <p className="text-xs leading-relaxed text-[#4A423B]">{evt.detail}</p>

                <div className="mt-2 pt-2 border-t border-[#E6DEC6]/50 flex items-center justify-between text-[10px] text-[#786E65]">
                  <span>Registrado por: <strong className="text-[#2D2621]">{evt.author_name || "Familiar"}</strong></span>
                  <span className="capitalize">{evt.kind}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <p className="text-sm text-[#786E65] text-center py-6">
              Nenhum registro de saúde encontrado nesta categoria.
            </p>
          )}
        </div>
      </div>

      {/* Continuous Medications List Overview */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-[#2E7D60]" />
            <h2 className="font-serif font-bold text-lg text-[#2D2621]">Medicações Contínuas Cadastradas</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {meds.map(m => (
            <div key={m.id} className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6]">
              <p className="font-bold text-sm text-[#2D2621]">{m.name}</p>
              <p className="text-xs text-[#786E65]">{m.dosage}</p>
              <p className="text-[11px] text-[#2E7D60] font-medium mt-1">Horário: {m.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
