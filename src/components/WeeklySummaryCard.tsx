import React, { useState, useEffect } from "react";
import { Sparkles, Heart, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const WeeklySummaryCard: React.FC = () => {
  const { authFetch, elder } = useAuth();
  const [summary, setSummary] = useState<string>("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await authFetch("/api/resumo-semanal");
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary || "");
          setHighlights(data.highlights || []);
        }
      } catch (err) {
        console.warn("Error loading weekly summary:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [authFetch]);

  if (loading || !summary) return null;

  return (
    <div
      id="card-weekly-summary"
      className="bg-gradient-to-br from-[#FAF6F0] to-[#E8F4F0] rounded-3xl p-5 sm:p-6 border border-[#E6DEC6] shadow-xs relative overflow-hidden transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2E7D60] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-[#2D2621]">
              Resumo da Semana • Inteligência Amparai
            </h3>
            <span className="text-[11px] text-[#786E65]">
              Síntese acolhedora para manter a família informada
            </span>
          </div>
        </div>

        <button
          id="btn-toggle-summary-details"
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-full text-[#786E65] hover:bg-white/80 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-sm leading-relaxed text-[#4A423B]">
        {summary}
      </p>

      {expanded && highlights.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E6DEC6]/60 space-y-2">
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#2E7D60] block">
            Destaques da Rotina:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl text-xs text-[#2D2621]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D60] shrink-0 mt-0.5" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
