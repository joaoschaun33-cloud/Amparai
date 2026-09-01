import React, { useState, useEffect } from "react";
import { Plus, Check, Bell, Calendar, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { WeeklySummaryCard } from "../components/WeeklySummaryCard";
import { Medication, Shift, Appointment } from "../types";

interface HojePageProps {
  onOpenAddModal: () => void;
  onOpenEscala: () => void;
  onOpenClinico: () => void;
}

export const HojePage: React.FC<HojePageProps> = ({
  onOpenAddModal,
  onOpenEscala,
  onOpenClinico,
}) => {
  const { authFetch, elder, showToast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    greeting: string;
    elder: any;
    medications: { total: number; taken: number; items: Medication[] };
    shifts: Shift[];
    appointments: Appointment[];
  } | null>(null);

  const loadHoje = async () => {
    try {
      const res = await authFetch("/api/hoje");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn("Error loading hoje:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHoje();
  }, []);

  const toggleMed = async (medId: string) => {
    try {
      const res = await authFetch(`/api/medications/${medId}/toggle`, { method: "POST" });
      if (res.ok) {
        const { taken } = await res.json();
        setData(prev => {
          if (!prev) return prev;
          const items = prev.medications.items.map(m => (m.id === medId ? { ...m, taken } : m));
          const takenCount = items.filter(m => m.taken).length;
          return {
            ...prev,
            medications: { ...prev.medications, taken: takenCount, items },
          };
        });
        showToast(taken ? "Medicamento marcado como tomado 💛" : "Medicamento desmarcado");
      }
    } catch {
      showToast("Erro ao atualizar medicação");
    }
  };

  const sendReminder = async (medId: string, medName: string) => {
    try {
      await authFetch(`/api/medications/${medId}/remind`, { method: "POST" });
      showToast(`Lembrete de ${medName} enviado com carinho!`);
    } catch {
      showToast("Lembrete enviado!");
    }
  };

  const elderName = elder?.name || data?.elder?.name || "Dona Maria";
  const elderPhoto = elder?.photo_url || data?.elder?.photo_url || "https://images.unsplash.com/photo-1539527073261-80acb74db86e?crop=entropy&cs=srgb&fm=jpg&w=400&q=80";

  return (
    <div className="space-y-6 pb-24">
      {/* Warm Welcome Banner & Elder Status */}
      <div
        id="banner-elder-status"
        className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6] flex flex-col sm:flex-row items-center justify-between gap-5"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative">
            <img
              src={elderPhoto}
              alt={elderName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-[#2E7D60] shadow-sm"
            />
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#2E7D60] border-2 border-white flex items-center justify-center text-[10px] text-white">
              ✓
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-2xl text-[#2D2621]">{elderName}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4F0] text-[#2E7D60] font-bold text-xs">
                Tudo bem
              </span>
            </div>
            <p className="text-xs text-[#786E65] mt-1">
              Última confirmação da família: <span className="font-semibold text-[#4A423B]">hoje às 20h14</span>
            </p>
          </div>
        </div>

        <button
          id="btn-quick-add"
          onClick={onOpenAddModal}
          className="w-full sm:w-auto px-5 py-3 rounded-full bg-[#2E7D60] text-white font-bold text-sm shadow-md hover:bg-[#23634B] active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Cuidado</span>
        </button>
      </div>

      {/* AI Weekly Summary Card */}
      <WeeklySummaryCard />

      {/* Medications of the Day */}
      <div id="section-medications" className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif font-bold text-lg text-[#2D2621]">Medicamentos de Hoje</h2>
            <p className="text-xs text-[#786E65]">
              {data?.medications?.taken || 0} de {data?.medications?.total || 0} tomados
            </p>
          </div>

          <button
            id="btn-add-med-direct"
            onClick={onOpenAddModal}
            className="text-xs font-bold text-[#2E7D60] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-[#FAF6F0] rounded-full overflow-hidden mb-4 border border-[#E6DEC6]/50">
          <div
            className="h-full bg-[#2E7D60] rounded-full transition-all duration-500"
            style={{
              width: `${
                data?.medications?.total
                  ? (data.medications.taken / data.medications.total) * 100
                  : 0
              }%`,
            }}
          />
        </div>

        <div className="space-y-3">
          {data?.medications?.items?.map(med => (
            <div
              key={med.id}
              id={`med-item-${med.id}`}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                med.taken
                  ? "bg-[#FAF6F0]/60 border-[#E6DEC6] opacity-80"
                  : "bg-white border-[#E6DEC6] shadow-xs"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  id={`btn-toggle-med-${med.id}`}
                  onClick={() => toggleMed(med.id)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    med.taken
                      ? "bg-[#2E7D60] border-[#2E7D60] text-white"
                      : "border-[#786E65] text-transparent hover:border-[#2E7D60]"
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>

                <div>
                  <h3
                    className={`font-semibold text-base text-[#2D2621] ${
                      med.taken ? "line-through text-[#786E65]" : ""
                    }`}
                  >
                    {med.name}
                  </h3>
                  <p className="text-xs text-[#786E65]">
                    {med.dosage} • <span className="font-medium text-[#4A423B]">{med.time}</span>
                  </p>
                </div>
              </div>

              {!med.taken && (
                <button
                  id={`btn-remind-med-${med.id}`}
                  onClick={() => sendReminder(med.id, med.name)}
                  title="Enviar lembrete carinhoso"
                  className="p-2 rounded-full text-[#786E65] hover:text-[#2E7D60] hover:bg-[#E8F4F0] transition-colors"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {(!data?.medications?.items || data.medications.items.length === 0) && (
            <p className="text-sm text-[#786E65] text-center py-4">Nenhum medicamento registrado para hoje.</p>
          )}
        </div>
      </div>

      {/* Escala Hoje e Amanhã */}
      <div id="section-shifts-today" className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif font-bold text-lg text-[#2D2621]">Plantão de Cuidado</h2>
            <p className="text-xs text-[#786E65]">Quem está com ela hoje e amanhã</p>
          </div>

          <button
            id="btn-view-full-escala"
            onClick={onOpenEscala}
            className="text-xs font-bold text-[#2E7D60] hover:underline flex items-center gap-0.5"
          >
            <span>Ver Escala Completa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.shifts?.map(shift => (
            <div
              key={shift.id}
              className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center font-bold text-sm">
                  {shift.caregiver_avatar || "C"}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#786E65]">
                    {shift.day_label} • {shift.slot}
                  </span>
                  <p className="font-semibold text-sm text-[#2D2621]">
                    {shift.caregiver_name || "A combinar"}
                  </p>
                  <span className="text-[11px] text-[#786E65]">{shift.role}</span>
                </div>
              </div>

              <span
                className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  shift.covered ? "bg-[#E8F4F0] text-[#2E7D60]" : "bg-amber-100 text-amber-800"
                }`}
              >
                {shift.covered ? "Confirmado" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Appointments & Consultas */}
      {data?.appointments && data.appointments.length > 0 && (
        <div id="section-appointments" className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif font-bold text-lg text-[#2D2621]">Próximas Consultas</h2>
            <span className="text-xs text-[#786E65]">MedBag</span>
          </div>

          <div className="space-y-2">
            {data.appointments.map(apt => (
              <div
                key={apt.id}
                className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E8F4F0] text-[#2E7D60] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#2D2621]">{apt.title}</p>
                    <p className="text-[#786E65]">
                      {apt.doctor ? `${apt.doctor} • ` : ""}{apt.location || "Consultório"}
                    </p>
                  </div>
                </div>

                <span className="font-bold text-[#2E7D60]">{apt.when}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
