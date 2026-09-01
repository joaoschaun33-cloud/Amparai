import React, { useState, useEffect } from 'react';
import { WeeklyCareSummary } from '../types';
import { Sparkles, Heart, ShieldCheck, CheckCircle2, Calendar, User, ArrowUpRight, Clock } from 'lucide-react';

export const WeeklySummaryCard: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyCareSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/weekly-summary');
      if (res.ok) {
        const data = await res.json();
        setWeeklyData(data);
      }
    } catch (e) {
      console.error("Erro ao carregar resumo semanal:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklySummary();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 shadow-xs animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-[#EAE0D3] rounded-full" />
          <div className="w-32 h-4 bg-[#EAE0D3] rounded" />
        </div>
        <div className="w-full h-12 bg-[#F7F0E6] rounded-xl" />
      </div>
    );
  }

  if (!weeklyData) return null;

  return (
    <section className="bg-gradient-to-br from-[#FFFDF9] to-[#F7F0E6] border border-[#8A9E74]/50 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE0D3] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 fill-[#5C6E49]/20 text-[#5C6E49]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Resumo da Semana (D-006)
              </span>
              <span className="text-[10px] text-[#5C6E49] font-semibold">
                {weeklyData.source_provider === 'gemini' ? '✨ Assistente Afetivo' : '✨ Amparai'}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-[#3E2F25] mt-0.5">
              Como foi a semana com a mãe
            </h3>
          </div>
        </div>

        <span className="text-xs font-semibold text-[#6B5A4C] bg-white/70 px-3 py-1 rounded-full border border-[#EAE0D3] self-start sm:self-auto">
          {weeklyData.week_label}
        </span>
      </div>

      {/* Main Tone Affirmation */}
      <div className="p-4 bg-white/90 rounded-xl border border-[#EAE0D3] shadow-2xs space-y-2">
        <p className="text-xs sm:text-sm text-[#3E2F25] leading-relaxed">
          {weeklyData.tone_summary}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 bg-[#EBF0E6]/60 border border-[#8A9E74]/30 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#465538] block">
            Adesão aos Remédios
          </span>
          <strong className="text-base sm:text-lg font-display font-bold text-[#3E2F25] block mt-0.5">
            {weeklyData.adherence_rate}%
          </strong>
          <span className="text-[10px] text-[#6B5A4C]">Horários cumpridos</span>
        </div>

        <div className="p-3 bg-[#EBF0E6]/60 border border-[#8A9E74]/30 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#465538] block">
            Cuidados Realizados
          </span>
          <strong className="text-base sm:text-lg font-display font-bold text-[#3E2F25] block mt-0.5">
            {weeklyData.completed_cares_count} de {weeklyData.total_cares_count}
          </strong>
          <span className="text-[10px] text-[#6B5A4C]">Rotina bem cuidada</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 bg-[#EBF0E6]/60 border border-[#8A9E74]/30 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#465538] block">
            Sinais Vitais
          </span>
          <strong className="text-xs sm:text-sm font-semibold text-[#3E2F25] block mt-1 line-clamp-1">
            {weeklyData.vital_stability}
          </strong>
          <span className="text-[10px] text-[#6B5A4C]">Pressão 125/82</span>
        </div>
      </div>

      {/* Expandable Weekly Highlights & Presence */}
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-[#EAE0D3] animate-fade-in">
          {/* Highlights */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#3E2F25]">Pontos altos da semana:</span>
            <ul className="space-y-1 text-xs text-[#6B5A4C]">
              {weeklyData.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5C6E49] shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Plantões e Presenças */}
          <div className="pt-2">
            <span className="text-xs font-bold text-[#3E2F25] block mb-1.5">Divisão de carinho na escala:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {weeklyData.shift_recap.map((s, idx) => (
                <div key={idx} className="bg-white px-3 py-1.5 rounded-lg border border-[#EAE0D3] text-[11px] text-[#3E2F25] flex items-center gap-1.5">
                  <User className="w-3 h-3 text-[#5C6E49]" />
                  <span><strong>{s.caregiver_name}</strong>: {s.shifts_count} presenças</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toggle Expand */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-[#A89B8F]">
          Custo de processamento IA: R$ 0,001 (Meta: ≤ R$ 2,00/mês)
        </span>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-[#5C6E49] hover:underline"
        >
          {isExpanded ? "Ocultar detalhes" : "Ver destaques da semana"}
        </button>
      </div>

    </section>
  );
};
