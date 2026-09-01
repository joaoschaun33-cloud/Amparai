import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoutineItem, DailyNote } from '../types';
import { Check, Clock, Plus, Sparkles, MessageSquare, Sun, Sunset, Moon, Heart, ChevronRight, User } from 'lucide-react';

export const HojeScreen: React.FC = () => {
  const { elder, openAddCare, user, setActiveTab } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/today');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, []);

  const handleToggleRoutine = async (item: RoutineItem) => {
    try {
      const res = await fetch(`/api/routine/${item.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBy: user?.name || "Família Schaun" }),
      });
      if (res.ok) {
        loadTodayData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/daily-summary', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setAiSummary(json.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAi(false);
    }
  };

  const routineItems: RoutineItem[] = data?.routine_items || [];
  const manhaItems = routineItems.filter(i => i.period === 'manha');
  const tardeItems = routineItems.filter(i => i.period === 'tarde');
  const noiteItems = routineItems.filter(i => i.period === 'noite');
  const dailyNotes: DailyNote[] = data?.daily_notes || [];

  const completedCount = routineItems.filter(i => i.completed).length;
  const totalCount = routineItems.length;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* 1. Main Reassuring Status Card: "Tá tudo bem com a mãe?" */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF0E6] border border-[#8A9E74]/30 flex items-center justify-center text-[#5C6E49] shrink-0 mt-0.5">
              <Heart className="w-6 h-6 fill-[#5C6E49]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#3E2F25]">
                  Tá tudo bem com {elder?.nickname || "a mãe"}
                </h2>
                <span className="w-2.5 h-2.5 rounded-full bg-[#5C6E49] animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm text-[#6B5A4C] mt-1">
                Última confirmação de cuidado: <strong>{data?.last_checkin || "Hoje de manhã"}</strong> ({data?.last_checkin_author || "Juliana"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#F7F0E6] px-4 py-2.5 rounded-xl border border-[#EAE0D3] self-start sm:self-auto">
            <User className="w-4 h-4 text-[#5C6E49]" />
            <div className="text-xs">
              <span className="text-[#6B5A4C] block font-medium">Plantão Hoje:</span>
              <strong className="text-[#3E2F25] font-semibold">{data?.today_shift?.caregiver_name || "Clara Santos"}</strong>
            </div>
            <button
              onClick={() => setActiveTab('escala')}
              className="ml-1 p-1 hover:bg-[#EFE6D8] rounded text-[#5C6E49]"
              title="Ver escala completa"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 pt-4 border-t border-[#EAE0D3]/60">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-[#6B5A4C]">
            <span>Cuidados concluídos hoje</span>
            <span className="font-bold text-[#3E2F25]">
              {completedCount} de {totalCount} ({Math.round((completedCount / (totalCount || 1)) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#EAE0D3] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5C6E49] rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completedCount / (totalCount || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. Resumo Carinhoso da Família (Gemini AI Summary - Friendly Nursing Tone) */}
      <section className="bg-gradient-to-r from-[#EBF0E6] to-[#F7F0E6] border border-[#8A9E74]/40 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[#465538]">
            <Sparkles className="w-4 h-4" />
            <h3 className="font-display font-bold text-sm sm:text-base">
              Boletim Carinhoso do Dia
            </h3>
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={generatingAi}
            className="text-xs font-bold text-white bg-[#5C6E49] hover:bg-[#465538] px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generatingAi ? "Preparando resumo..." : "Atualizar Resumo"}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#3E2F25] leading-relaxed bg-[#FFFDF9]/80 p-3.5 rounded-xl border border-[#EAE0D3]">
          {aiSummary || `Hoje o dia com ${elder?.nickname || "Dona Helena"} correu com muita tranquilidade e carinho. Os cuidados da manhã foram cumpridos no horário, a caminhada no jardim trouxe boa disposição e a hidratação está em dia. A família e a cuidadora estão bem alinhadas!`}
        </p>
      </section>

      {/* 3. Rotina do Dia (Manhã, Tarde, Noite) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-[#3E2F25]">
              Rotina & Cuidados de Hoje
            </h3>
            <p className="text-xs text-[#6B5A4C]">Marque conforme os cuidados forem realizados</p>
          </div>
          <button
            onClick={() => openAddCare('rotina')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3 py-1.5 rounded-xl transition-colors border border-[#8A9E74]/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Cuidado
          </button>
        </div>

        {/* Manhã */}
        <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#C4633F] uppercase tracking-wider">
            <Sun className="w-4 h-4" />
            <span>Manhã</span>
          </div>
          <div className="space-y-2">
            {manhaItems.map(item => (
              <RoutineCard key={item.id} item={item} onToggle={() => handleToggleRoutine(item)} />
            ))}
          </div>
        </div>

        {/* Tarde */}
        <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E8A854] uppercase tracking-wider">
            <Sunset className="w-4 h-4" />
            <span>Tarde</span>
          </div>
          <div className="space-y-2">
            {tardeItems.map(item => (
              <RoutineCard key={item.id} item={item} onToggle={() => handleToggleRoutine(item)} />
            ))}
          </div>
        </div>

        {/* Noite */}
        <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#465538] uppercase tracking-wider">
            <Moon className="w-4 h-4" />
            <span>Noite</span>
          </div>
          <div className="space-y-2">
            {noiteItems.map(item => (
              <RoutineCard key={item.id} item={item} onToggle={() => handleToggleRoutine(item)} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Notícias do Dia / Passagem de Bastão */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE0D3] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#5C6E49]" />
            <h3 className="font-display font-bold text-base text-[#3E2F25]">
              Passagem de Bastão & Notícias
            </h3>
          </div>
          <button
            onClick={() => openAddCare('nota')}
            className="text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3 py-1.5 rounded-xl transition-colors"
          >
            + Deixar Recado
          </button>
        </div>

        <div className="space-y-3">
          {dailyNotes.map(note => (
            <div key={note.id} className="p-3.5 rounded-xl bg-[#F7F0E6] border border-[#EAE0D3] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <strong className="font-semibold text-[#3E2F25]">{note.author_name}</strong>
                  <span className="text-[11px] text-[#6B5A4C]">({note.author_role})</span>
                </div>
                <span className="text-[11px] text-[#A89B8F]">{note.created_at || note.date}</span>
              </div>
              <p className="text-xs sm:text-sm text-[#3E2F25] leading-relaxed">
                {note.content || note.detail}
              </p>
              {note.mood && (
                <div className="pt-1">
                  <span className="text-[10px] font-semibold text-[#5C6E49] bg-[#EBF0E6] px-2 py-0.5 rounded-full">
                    Disposição: {note.mood}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

function RoutineCard({ item, onToggle }: { item: RoutineItem; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
        item.completed
          ? 'bg-[#EBF0E6]/50 border-[#8A9E74]/40 text-[#6B5A4C]'
          : 'bg-[#F7F0E6]/30 border-[#EAE0D3] hover:bg-[#F7F0E6] text-[#3E2F25]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
            item.completed
              ? 'bg-[#5C6E49] border-[#5C6E49] text-white'
              : 'border-[#A89B8F] bg-white hover:border-[#5C6E49]'
          }`}
        >
          {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs sm:text-sm font-semibold truncate ${item.completed ? 'line-through opacity-75' : ''}`}>
              {item.title}
            </span>
            {item.dosage && (
              <span className="text-[11px] text-[#6B5A4C] bg-white border border-[#EAE0D3] px-1.5 py-0.2 rounded font-normal shrink-0">
                {item.dosage}
              </span>
            )}
          </div>
          {item.completed && item.completed_at && (
            <p className="text-[10px] text-[#5C6E49] font-medium mt-0.5">
              Feito às {item.completed_at} por {item.completed_by || 'Família'}
            </p>
          )}
          {item.notes && !item.completed && (
            <p className="text-[11px] text-[#6B5A4C] truncate mt-0.5">{item.notes}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-[#6B5A4C] shrink-0 font-medium bg-white px-2 py-1 rounded-lg border border-[#EAE0D3]">
        <Clock className="w-3 h-3 text-[#5C6E49]" />
        <span>{item.time}</span>
      </div>
    </div>
  );
}
