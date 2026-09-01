import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Expense } from '../types';
import { Plus, ArrowUpRight, ArrowDownLeft, Copy, Check, Receipt, CreditCard } from 'lucide-react';

export const CustosScreen: React.FC = () => {
  const { elder, openAddCare } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/costs');
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
    loadCosts();
  }, []);

  const handleCopyPix = (pix: string) => {
    navigator.clipboard.writeText(pix);
    setCopiedKey(pix);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const expenses: Expense[] = data?.expenses || [];
  const balances = data?.balances || [];
  const totalAmount: number = data?.total_amount || 0;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Total & Summary Card */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="bg-[#EBF0E6] text-[#465538] text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Custos Compartilhados
            </span>
            <h2 className="font-display text-2xl font-bold text-[#3E2F25] mt-1.5">
              Divisão das Despesas da Família
            </h2>
            <p className="text-xs sm:text-sm text-[#6B5A4C] mt-0.5">
              Transparência e acerto sem atrito entre os filhos de <strong>{elder?.nickname || "Dona Helena"}</strong>.
            </p>
          </div>

          <div className="bg-[#F7F0E6] p-4 rounded-xl border border-[#EAE0D3] shrink-0">
            <span className="text-xs text-[#6B5A4C] block font-medium">Total do Mês:</span>
            <strong className="font-display text-2xl text-[#5C6E49] font-bold">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </section>

      {/* Balances / Acerto entre irmãos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[#3E2F25] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#5C6E49]" />
            Acerto de Contas & Chaves PIX
          </h3>
          <button
            onClick={() => openAddCare('custo')}
            className="text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3 py-1.5 rounded-xl border border-[#8A9E74]/30 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Lançar Despesa
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {balances.map((b: any, idx: number) => {
            const isCreditor = b.net_balance > 0;
            const isDebtor = b.net_balance < 0;

            return (
              <div key={idx} className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-[#3E2F25]">{b.member_name}</h4>
                    {isCreditor && (
                      <span className="text-[10px] font-bold text-[#5C6E49] bg-[#EBF0E6] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" /> A Receber
                      </span>
                    )}
                    {isDebtor && (
                      <span className="text-[10px] font-bold text-[#C4633F] bg-[#FFF9F0] border border-[#C4633F]/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <ArrowDownLeft className="w-3 h-3" /> A Pagar
                      </span>
                    )}
                    {!isCreditor && !isDebtor && (
                      <span className="text-[10px] font-bold text-[#6B5A4C] bg-[#F7F0E6] px-2 py-0.5 rounded-full">
                        Em Dia
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-0.5 text-xs text-[#6B5A4C]">
                    <p>Total pago: <strong>R$ {b.total_paid.toFixed(2)}</strong></p>
                    <p>Parte justa: <strong>R$ {b.fair_share.toFixed(2)}</strong></p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EAE0D3]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#6B5A4C]">Saldo:</span>
                    <strong className={`font-bold ${isCreditor ? 'text-[#5C6E49]' : isDebtor ? 'text-[#C4633F]' : 'text-[#3E2F25]'}`}>
                      {isCreditor ? '+' : ''}R$ {b.net_balance.toFixed(2)}
                    </strong>
                  </div>

                  {b.pix_key && (
                    <button
                      onClick={() => handleCopyPix(b.pix_key)}
                      className="mt-2 w-full py-1.5 px-2 bg-[#F7F0E6] hover:bg-[#EFE6D8] rounded-lg text-[11px] font-semibold text-[#3E2F25] flex items-center justify-center gap-1 transition-colors border border-[#EAE0D3]"
                    >
                      {copiedKey === b.pix_key ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#5C6E49]" />
                          <span>PIX Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#6B5A4C]" />
                          <span className="truncate">PIX: {b.pix_key}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* Expenses List */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-[#3E2F25] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#C4633F]" />
          Lançamentos Recentes
        </h3>

        <div className="space-y-2.5">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1">
                  {exp.category}
                </span>
                <h4 className="font-semibold text-sm sm:text-base text-[#3E2F25]">{exp.title}</h4>
                <p className="text-xs text-[#6B5A4C]">
                  Pago por <strong>{exp.paid_by_name || 'Família'}</strong> em {exp.date}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="font-display font-bold text-base sm:text-lg text-[#3E2F25] block">
                  R$ {exp.amount.toFixed(2)}
                </span>
                <span className="text-[11px] text-[#6B5A4C]">
                  Dividido em 3
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
