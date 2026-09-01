import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Sparkles, Check, X, MessageSquareHeart, Smile } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [peaceOfMindRating, setPeaceOfMindRating] = useState(5);
  const [dailyRoutineRating, setDailyRoutineRating] = useState(5);
  const [message, setMessage] = useState('');
  const [highlight, setHighlight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_member_name: user ? `${user.name} (${user.role === 'coordenador' ? 'Filha/Coord' : 'Familiar'})` : 'Membro da Família',
          peace_of_mind_rating: peaceOfMindRating,
          daily_routine_easy_rating: dailyRoutineRating,
          message,
          highlight: highlight || 'Tranquilidade e rotina sincronizada',
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setMessage('');
          setHighlight('');
          onClose();
        }, 1800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE0D3] pb-3">
          <div className="flex items-center gap-2 text-[#5C6E49]">
            <MessageSquareHeart className="w-5 h-5" />
            <h3 className="font-display font-bold text-lg text-[#3E2F25]">
              Como está sendo o Amparai para você?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#F7F0E6] text-[#6B5A4C]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 bg-[#EBF0E6] text-[#465538] rounded-2xl text-center space-y-2 animate-fade-in">
            <Heart className="w-8 h-8 text-[#5C6E49] mx-auto fill-[#5C6E49]" />
            <h4 className="font-display font-bold text-base text-[#3E2F25]">Muito obrigado pelo seu carinho!</h4>
            <p className="text-xs text-[#465538]">
              Seu relato ajuda o time de produto a tornar o dia a dia de outras famílias ainda mais sereno.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[#6B5A4C] leading-relaxed">
              Você faz parte do nosso <strong>Piloto Fechado com Famílias</strong>. Sua opinião sincera é a nossa bússola de desenvolvimento.
            </p>

            {/* Rating 1: Paz de Espírito */}
            <div className="space-y-1.5 p-3.5 bg-white rounded-xl border border-[#EAE0D3]">
              <label className="block text-xs font-bold text-[#3E2F25]">
                Quanto o Amparai aumentou a sua paz de espírito hoje?
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPeaceOfMindRating(val)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      peaceOfMindRating >= val
                        ? 'bg-[#EBF0E6] text-[#465538] border border-[#8A9E74]/40'
                        : 'bg-[#F7F0E6]/50 text-[#A89B8F]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${peaceOfMindRating >= val ? 'fill-[#5C6E49] text-[#5C6E49]' : ''}`} />
                    {val}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#6B5A4C] block text-right">
                {peaceOfMindRating === 5 ? "Muita tranquilidade!" : peaceOfMindRating >= 3 ? "Ajudou bastante" : "Pode melhorar"}
              </span>
            </div>

            {/* Rating 2: Facilidade de Rotina */}
            <div className="space-y-1.5 p-3.5 bg-white rounded-xl border border-[#EAE0D3]">
              <label className="block text-xs font-bold text-[#3E2F25]">
                Facilidade para registrar e acompanhar os remédios e plantões:
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDailyRoutineRating(val)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      dailyRoutineRating >= val
                        ? 'bg-[#5C6E49] text-white'
                        : 'bg-[#F7F0E6] text-[#A89B8F]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Message */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#3E2F25]">
                O que mais fez diferença no cuidado com a mãe? *
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conte com suas palavras (ex: 'Saber a hora que o remédio foi tomado', 'Dividir a escala sem discussões no grupo de família')..."
                className="w-full text-xs p-3 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#3E2F25]">
                Alguma sugestão ou dúvida para o diretor de produto? (Opcional)
              </label>
              <input
                type="text"
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder="Ex: 'Gostaria de anexar fotos mais rápido' ou 'Adicionar mais um irmão'."
                className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold px-4 py-2 rounded-xl text-[#6B5A4C] hover:bg-[#F7F0E6]"
              >
                Depois
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold px-5 py-2.5 rounded-xl bg-[#5C6E49] hover:bg-[#465538] text-white disabled:opacity-40 transition-all shadow-xs flex items-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                {isSubmitting ? "Enviando..." : "Enviar Feedback Afetivo"}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
