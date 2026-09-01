import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shift, CircleMember } from '../types';
import { RefreshCw } from 'lucide-react';

export const EscalaScreen: React.FC = () => {
  const { elder } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<Shift | null>(null);
  const [substituteName, setSubstituteName] = useState('Mariana Schaun');
  const [swapNote, setSwapNote] = useState('');

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
        setMembers(data.members || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForSwap) return;

    try {
      const res = await fetch(`/api/schedule/${selectedShiftForSwap.id}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substitute_name: substituteName,
          notes: swapNote,
        }),
      });
      if (res.ok) {
        loadSchedule();
        setSelectedShiftForSwap(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Header Banner */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="bg-[#EBF0E6] text-[#465538] text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Escala da Família
            </span>
            <h2 className="font-display text-2xl font-bold text-[#3E2F25] mt-1.5">
              Quem cuida hoje e nos próximos dias
            </h2>
            <p className="text-xs sm:text-sm text-[#6B5A4C] mt-1">
              Divisão leve entre os filhos e cuidadores de <strong>{elder?.nickname || "Dona Helena"}</strong>. Folgas e substituições alinhadas com carinho.
            </p>
          </div>
        </div>
      </section>

      {/* Shifts List */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-[#3E2F25] px-1">
          Próximos Plantões & Folgas
        </h3>

        <div className="space-y-3">
          {shifts.map((shift, idx) => {
            const isToday = idx === 0;
            const isFolga = shift.status === 'folga';
            const isTroca = shift.status === 'troca_solicitada';
            const shiftDate = shift.date ? new Date(shift.date) : new Date();

            return (
              <div
                key={shift.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                  isToday
                    ? 'bg-[#FFFDF9] border-[#5C6E49] shadow-sm ring-1 ring-[#5C6E49]/20'
                    : 'bg-[#FFFDF9] border-[#EAE0D3]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Date and Person */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        isToday
                          ? 'bg-[#5C6E49] text-white border-[#5C6E49]'
                          : isFolga
                          ? 'bg-[#FFF9F0] text-[#E8A854] border-[#E8A854]'
                          : 'bg-[#F7F0E6] text-[#3E2F25] border-[#EAE0D3]'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase leading-none">
                        {shiftDate.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                      </span>
                      <span className="font-display font-bold text-sm leading-none mt-0.5">
                        {shiftDate.getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm sm:text-base text-[#3E2F25]">
                          {shift.caregiver_name}
                        </h4>
                        {isToday && (
                          <span className="bg-[#5C6E49] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Hoje
                          </span>
                        )}
                        {isFolga && (
                          <span className="bg-[#FFF9F0] text-[#E8A854] border border-[#E8A854] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Folga em Família
                          </span>
                        )}
                        {isTroca && (
                          <span className="bg-[#EBF0E6] text-[#5C6E49] border border-[#8A9E74] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Substituição Combinada
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#6B5A4C] mt-0.5">
                        Período: <strong className="font-medium text-[#3E2F25]">{shift.period === 'integral' ? 'Dia Todo (08h às 18h)' : (shift.period || 'Dia Todo')}</strong>
                      </p>

                      {shift.notes && (
                        <p className="text-xs text-[#6B5A4C] mt-1 bg-[#F7F0E6] p-2 rounded-lg">
                          {shift.notes}
                        </p>
                      )}
                      {shift.substitute_name && (
                        <p className="text-xs text-[#5C6E49] font-medium mt-1">
                          Cobertura por: <strong>{shift.substitute_name}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isFolga && (
                    <button
                      onClick={() => setSelectedShiftForSwap(shift)}
                      className="self-start sm:self-center text-xs font-semibold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3 py-1.5 rounded-xl border border-[#8A9E74]/30 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Trocar Plantão
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Swap Modal */}
      {selectedShiftForSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FFFDF9] rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-[#EAE0D3]">
            <div className="bg-[#F7F0E6] p-4 border-b border-[#EAE0D3] flex justify-between items-center">
              <h4 className="font-display font-bold text-base text-[#3E2F25]">
                Solicitar Troca Gentil de Plantão
              </h4>
              <button
                onClick={() => setSelectedShiftForSwap(null)}
                className="text-[#6B5A4C] text-sm hover:text-[#3E2F25]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSwapRequest} className="p-5 space-y-4">
              <p className="text-xs text-[#6B5A4C]">
                Plantão de <strong>{selectedShiftForSwap.caregiver_name}</strong> no dia <strong>{selectedShiftForSwap.date ? new Date(selectedShiftForSwap.date).toLocaleDateString('pt-BR') : ''}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Quem pode cobrir neste dia?
                </label>
                <select
                  value={substituteName}
                  onChange={e => setSubstituteName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25] focus:outline-none focus:ring-2 focus:ring-[#5C6E49]"
                >
                  <option value="Juliana Schaun">Juliana Schaun (Filha)</option>
                  <option value="Rodrigo Schaun">Rodrigo Schaun (Filho)</option>
                  <option value="Mariana Schaun">Mariana Schaun (Filha)</option>
                  <option value="Clara Santos">Clara Santos (Cuidadora)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Motivo ou Recado Carinhoso
                </label>
                <input
                  type="text"
                  value={swapNote}
                  onChange={e => setSwapNote(e.target.value)}
                  placeholder="Ex: Tenho uma consulta médica nesse horário..."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25] focus:outline-none focus:ring-2 focus:ring-[#5C6E49]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EAE0D3]">
                <button
                  type="button"
                  onClick={() => setSelectedShiftForSwap(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B5A4C]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5C6E49] text-white hover:bg-[#465538]"
                >
                  Confirmar Troca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
