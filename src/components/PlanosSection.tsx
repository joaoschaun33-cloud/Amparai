import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SubscriptionInfo } from '../types';
import { 
  Sparkles, 
  Check, 
  Heart, 
  Users, 
  ShieldCheck, 
  Calendar, 
  FolderLock, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';

export const PlanosSection: React.FC = () => {
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubInfo(data.subscription);
        setPlans(data.plans_available || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleChangePlan = async (planId: string) => {
    try {
      setUpdating(true);
      const res = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubInfo(data.subscription);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="py-6 text-center text-xs text-[#6B5A4C]">Carregando planos familiares...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-[#3E2F25]">Plano do Círculo Familiar</h3>
          <p className="text-xs text-[#6B5A4C]">Uma única assinatura protege e conecta toda a família.</p>
        </div>
        {subInfo && (
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
            subInfo.current_plan === 'circulo_familiar' 
              ? 'bg-[#EBF0E6] text-[#465538] border border-[#8A9E74]/40' 
              : 'bg-[#F7F0E6] text-[#6B5A4C]'
          }`}>
            {subInfo.plan_name}
          </span>
        )}
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((p) => {
          const isCurrent = subInfo?.current_plan === p.id;
          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                p.popular 
                  ? 'bg-[#FFFDF9] border-[#5C6E49] shadow-sm relative' 
                  : 'bg-white border-[#EAE0D3]'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 right-4 bg-[#5C6E49] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 shadow-2xs">
                  <Heart className="w-3 h-3 fill-white" /> Recomendado para Famílias
                </span>
              )}

              <div className="space-y-3">
                <div>
                  <h4 className="font-display font-bold text-base text-[#3E2F25]">{p.name}</h4>
                  <p className="text-xs text-[#6B5A4C] mt-0.5">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1 py-1">
                  <span className="font-display text-2xl font-bold text-[#3E2F25]">
                    {p.price_brl === 0 ? "Gratuito" : `R$ ${p.price_brl.toFixed(2).replace('.', ',')}`}
                  </span>
                  <span className="text-[11px] text-[#6B5A4C]">/{p.period}</span>
                </div>

                <div className="border-t border-[#EAE0D3] pt-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89B8F] block">
                    O que está incluído:
                  </span>
                  <ul className="space-y-1.5">
                    {p.features.map((feat: string, idx: number) => (
                      <li key={idx} className="text-xs text-[#3E2F25] flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#5C6E49] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5">
                <button
                  type="button"
                  disabled={isCurrent || updating}
                  onClick={() => handleChangePlan(p.id)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#EBF0E6] text-[#465538] border border-[#8A9E74]/40 cursor-default'
                      : p.popular
                      ? 'bg-[#5C6E49] hover:bg-[#465538] text-white shadow-xs'
                      : 'bg-[#F7F0E6] hover:bg-[#EAE0D3] text-[#3E2F25]'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Seu Plano Atual
                    </>
                  ) : (
                    <>
                      Escolher {p.name} <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Sustainable AI & Micro-cost Footnote */}
      <div className="p-3 bg-[#F7F0E6]/50 rounded-xl border border-[#EAE0D3] flex items-center gap-2.5 text-[11px] text-[#6B5A4C]">
        <ShieldCheck className="w-4 h-4 text-[#5C6E49] shrink-0" />
        <span>
          <strong>Modelo de Transparência:</strong> Nosso custo de computação e IA é inferior a 5% da mensalidade, garantindo a sustentabilidade e privacidade do Amparai a longo prazo.
        </span>
      </div>

    </div>
  );
};
