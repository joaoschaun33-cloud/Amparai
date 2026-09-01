import React, { useState, useEffect } from "react";
import { X, Pill, Activity, Calendar, DollarSign, Check, MessageSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export interface AddCareModalProps {
  initialTab?: "rotina" | "remedio" | "nota" | "custo" | "plantao";
  onClose?: () => void;
  onSuccess?: () => void;
}

export const AddCareModal: React.FC<AddCareModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { isAddCareOpen, setIsAddCareOpen, addCareType, user, refreshData } = useAuth();
  const [tab, setTab] = useState<'rotina' | 'remedio' | 'nota' | 'custo' | 'plantao'>('rotina');
  const [loading, setLoading] = useState(false);

  // Sync tab with context type
  useEffect(() => {
    if (addCareType) {
      setTab(addCareType);
    }
  }, [addCareType]);

  // Form states
  // 1. Rotina / Cuidado
  const [routineTitle, setRoutineTitle] = useState("");
  const [routinePeriod, setRoutinePeriod] = useState<"manha" | "tarde" | "noite">("manha");
  const [routineTime, setRoutineTime] = useState("08:00");
  const [routineDosage, setRoutineDosage] = useState("");
  const [routineNotes, setRoutineNotes] = useState("");

  // 2. Remédio
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medTimes, setMedTimes] = useState("08:00, 20:00");
  const [medStockDays, setMedStockDays] = useState("30");
  const [medInstructions, setMedInstructions] = useState("");

  // 3. Nota / Recado
  const [noteContent, setNoteContent] = useState("");
  const [noteMood, setNoteMood] = useState("Tranquila e bem-disposta");

  // 4. Custo
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("farmacia");

  // 5. Plantão
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftCaregiver, setShiftCaregiver] = useState("Juliana Schaun");
  const [shiftPeriod, setShiftPeriod] = useState("integral");
  const [shiftNotes, setShiftNotes] = useState("");

  if (!isAddCareOpen) return null;

  const handleClose = () => {
    setIsAddCareOpen(false);
    if (onClose) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab === "rotina") {
        await fetch("/api/routine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: routineTitle,
            period: routinePeriod,
            time: routineTime,
            dosage: routineDosage,
            notes: routineNotes,
          }),
        });
        // Salvo com sucesso
      } else if (tab === "remedio") {
        await fetch("/api/medications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: medName,
            dosage: medDosage || "1 comprimido",
            schedule_times: medTimes.split(",").map(t => t.trim()),
            stock_days_left: parseInt(medStockDays) || 30,
            instructions: medInstructions,
            prescription_holder: user?.name || "Juliana",
          }),
        });
      } else if (tab === "nota") {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: noteContent,
            mood: noteMood,
            author_name: user?.name || "Juliana Schaun",
            author_role: user?.role || "Coordenador",
          }),
        });
      } else if (tab === "custo") {
        await fetch("/api/costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: expTitle,
            amount: parseFloat(expAmount.replace(",", ".")) || 0,
            category: expCategory,
            paid_by_name: user?.name || "Juliana Schaun",
          }),
        });
      } else if (tab === "plantao") {
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: shiftDate,
            caregiver_name: shiftCaregiver,
            period: shiftPeriod,
            notes: shiftNotes,
          }),
        });
      }

      await refreshData();
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#EAE0D3] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-[#F7F0E6] border-b border-[#EAE0D3] flex items-center justify-between">
          <h3 className="font-display font-bold text-base sm:text-lg text-[#3E2F25]">
            Registrar Cuidado com a Mãe
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-[#6B5A4C] hover:bg-[#EAE0D3] hover:text-[#3E2F25] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#EAE0D3] bg-[#FFFDF9] overflow-x-auto text-xs font-semibold p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setTab("rotina")}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl shrink-0 transition-colors ${
              tab === "rotina"
                ? "bg-[#5C6E49] text-white"
                : "text-[#6B5A4C] hover:bg-[#F7F0E6]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Rotina</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("remedio")}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl shrink-0 transition-colors ${
              tab === "remedio"
                ? "bg-[#5C6E49] text-white"
                : "text-[#6B5A4C] hover:bg-[#F7F0E6]"
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Remédio</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("nota")}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl shrink-0 transition-colors ${
              tab === "nota"
                ? "bg-[#5C6E49] text-white"
                : "text-[#6B5A4C] hover:bg-[#F7F0E6]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Recado</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("custo")}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl shrink-0 transition-colors ${
              tab === "custo"
                ? "bg-[#5C6E49] text-white"
                : "text-[#6B5A4C] hover:bg-[#F7F0E6]"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Custo</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("plantao")}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl shrink-0 transition-colors ${
              tab === "plantao"
                ? "bg-[#5C6E49] text-white"
                : "text-[#6B5A4C] hover:bg-[#F7F0E6]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Plantão</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB: Rotina */}
          {tab === "rotina" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Nome do Cuidado / Ação
                </label>
                <input
                  type="text"
                  required
                  value={routineTitle}
                  onChange={e => setRoutineTitle(e.target.value)}
                  placeholder="Ex: Medir Pressão Arterial, Caminhada leve no jardim, Banho"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25] focus:outline-none focus:ring-2 focus:ring-[#5C6E49]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Período do Dia
                  </label>
                  <select
                    value={routinePeriod}
                    onChange={e => setRoutinePeriod(e.target.value as any)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  >
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Horário Sugerido
                  </label>
                  <input
                    type="time"
                    value={routineTime}
                    onChange={e => setRoutineTime(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Dosagem / Meta (Opcional)
                </label>
                <input
                  type="text"
                  value={routineDosage}
                  onChange={e => setRoutineDosage(e.target.value)}
                  placeholder="Ex: 1 copo d'água, 15 minutos"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={routineNotes}
                  onChange={e => setRoutineNotes(e.target.value)}
                  placeholder="Ex: Antes do café, com carinho"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                />
              </div>
            </>
          )}

          {/* TAB: Remédio */}
          {tab === "remedio" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Nome do Medicamento
                </label>
                <input
                  type="text"
                  required
                  value={medName}
                  onChange={e => setMedName(e.target.value)}
                  placeholder="Ex: Losartana Potássica, Vitamina D"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25] focus:outline-none focus:ring-2 focus:ring-[#5C6E49]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Dosagem
                  </label>
                  <input
                    type="text"
                    required
                    value={medDosage}
                    onChange={e => setMedDosage(e.target.value)}
                    placeholder="Ex: 50mg, 1 comprimido"
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Horários (separar por vírgula)
                  </label>
                  <input
                    type="text"
                    value={medTimes}
                    onChange={e => setMedTimes(e.target.value)}
                    placeholder="08:00, 20:00"
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Dias de Estoque Estimados
                </label>
                <input
                  type="number"
                  value={medStockDays}
                  onChange={e => setMedStockDays(e.target.value)}
                  placeholder="30"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Instruções da Médica
                </label>
                <input
                  type="text"
                  value={medInstructions}
                  onChange={e => setMedInstructions(e.target.value)}
                  placeholder="Ex: Tomar em jejum com água abundante"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                />
              </div>
            </>
          )}

          {/* TAB: Recado */}
          {tab === "nota" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Recado para o Círculo da Família
                </label>
                <textarea
                  rows={3}
                  required
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Ex: Mãe dormiu muito bem, almoçou tudo e gostou bastante do suco de maracujá."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25] focus:outline-none focus:ring-2 focus:ring-[#5C6E49]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Disposição / Humor da Mãe
                </label>
                <select
                  value={noteMood}
                  onChange={e => setNoteMood(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                >
                  <option value="Tranquila e bem-disposta">Tranquila e bem-disposta</option>
                  <option value="Alegre e comunicativa">Alegre e comunicativa</option>
                  <option value="Sonolenta e descansando">Sonolenta e descansando</option>
                  <option value="Um pouco cansada">Um pouco cansada</option>
                </select>
              </div>
            </>
          )}

          {/* TAB: Custo */}
          {tab === "custo" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Descrição da Despesa
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  placeholder="Ex: Farmácia Pacheco (remédios do mês), Fisioterapia"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25] focus:outline-none focus:ring-2 focus:ring-[#5C6E49]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    placeholder="185,90"
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Categoria
                  </label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  >
                    <option value="farmacia">Farmácia</option>
                    <option value="cuidador">Cuidador / Enfermagem</option>
                    <option value="consulta">Consulta / Exame</option>
                    <option value="compras">Mercado / Feira</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* TAB: Plantão */}
          {tab === "plantao" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={shiftDate}
                    onChange={e => setShiftDate(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                    Responsável
                  </label>
                  <select
                    value={shiftCaregiver}
                    onChange={e => setShiftCaregiver(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                  >
                    <option value="Juliana Schaun">Juliana Schaun (Filha)</option>
                    <option value="Rodrigo Schaun">Rodrigo Schaun (Filho)</option>
                    <option value="Mariana Schaun">Mariana Schaun (Filha)</option>
                    <option value="Clara Santos">Clara Santos (Cuidadora)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Período
                </label>
                <select
                  value={shiftPeriod}
                  onChange={e => setShiftPeriod(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                >
                  <option value="integral">Dia Todo (08h às 18h)</option>
                  <option value="manha">Manhã (08h às 12h)</option>
                  <option value="tarde">Tarde (12h às 18h)</option>
                  <option value="noite">Noite / Pernoite (18h às 08h)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E2F25] mb-1">
                  Recados da Escala
                </label>
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={e => setShiftNotes(e.target.value)}
                  placeholder="Ex: Levar ao médico às 14h"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                />
              </div>
            </>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-[#EAE0D3] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B5A4C] hover:bg-[#F7F0E6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5C6E49] text-white hover:bg-[#465538] shadow-xs flex items-center gap-1.5 transition-all active:scale-98"
            >
              <Check className="w-4 h-4" />
              {loading ? "Salvando..." : "Salvar Registro"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
