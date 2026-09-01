import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Shift } from "../types";

interface EscalaPageProps {
  onOpenAddModal: () => void;
}

export const EscalaPage: React.FC<EscalaPageProps> = ({ onOpenAddModal }) => {
  const { authFetch, elder } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [contribution, setContribution] = useState<Record<string, number>>({});

  const loadEscala = async () => {
    try {
      const res = await authFetch("/api/escala");
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
        setContribution(data.contribution || {});
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadEscala();
  }, []);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6] flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-2xl text-[#2D2621]">Escala de Cuidados</h1>
          <p className="text-xs text-[#786E65]">
            Organização compartilhada entre irmãos e cuidadores de {elder?.name || "Dona Maria"}
          </p>
        </div>

        <button
          id="btn-add-shift"
          onClick={onOpenAddModal}
          className="px-4 py-2.5 rounded-full bg-[#2E7D60] text-white font-bold text-xs shadow-sm hover:bg-[#23634B] flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Turno</span>
        </button>
      </div>

      {/* Contribution Breakdown */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <h2 className="font-serif font-bold text-base text-[#2D2621] mb-3">Distribuição do Cuidado no Mês</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(contribution).map(([name, count]) => (
            <div key={name} className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] text-center">
              <div className="w-8 h-8 rounded-full bg-[#2E7D60] text-white font-bold text-xs mx-auto mb-1 flex items-center justify-center">
                {name.charAt(0)}
              </div>
              <p className="font-bold text-sm text-[#2D2621]">{name}</p>
              <p className="text-[11px] text-[#786E65]">{count} plantões cobertos</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <h2 className="font-serif font-bold text-lg text-[#2D2621] mb-4">Próximos Dias</h2>

        <div className="space-y-3">
          {shifts.map(shift => (
            <div
              key={shift.id}
              className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2E7D60] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {shift.caregiver_avatar || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#2D2621]">
                      {shift.day_label} ({shift.slot})
                    </span>
                  </div>
                  <p className="text-xs text-[#4A423B]">
                    {shift.caregiver_name || "A combinar com a família"}
                  </p>
                  <span className="text-[11px] text-[#786E65]">{shift.role}</span>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  shift.covered
                    ? "bg-[#E8F4F0] text-[#2E7D60]"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                {shift.covered ? "Confirmado" : "Disponível"}
              </span>
            </div>
          ))}

          {shifts.length === 0 && (
            <p className="text-sm text-[#786E65] text-center py-6">Nenhum plantão agendado na escala.</p>
          )}
        </div>
      </div>
    </div>
  );
};
