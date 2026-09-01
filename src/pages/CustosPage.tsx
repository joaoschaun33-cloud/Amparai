import React, { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Expense } from "../types";

interface CustosPageProps {
  onOpenAddModal: () => void;
}

export const CustosPage: React.FC<CustosPageProps> = ({ onOpenAddModal }) => {
  const { authFetch, showToast } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalMonth, setTotalMonth] = useState(0);
  const [splitBalances, setSplitBalances] = useState<{ name: string; balance: number }[]>([]);

  const loadCustos = async () => {
    try {
      const res = await authFetch("/api/custos");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalMonth(data.total_month || 0);
        setSplitBalances(data.balances || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCustos();
  }, []);

  const handleToggleStatus = async (expId: string, memberName: string) => {
    try {
      const res = await authFetch(`/api/expenses/${expId}/toggle-member`, {
        method: "POST",
        body: JSON.stringify({ member: memberName }),
      });
      if (res.ok) {
        showToast(`Status de ${memberName} atualizado!`);
        loadCustos();
      }
    } catch {
      showToast("Erro ao atualizar rateio");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header with Monthly Total */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#786E65]">
            Gastos Compartilhados do Mês
          </span>
          <h1 className="font-serif font-bold text-3xl text-[#2D2621]">
            R$ {totalMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </h1>
          <p className="text-xs text-[#786E65] mt-1">Transparência e rateio tranquilo entre os irmãos</p>
        </div>

        <button
          id="btn-add-expense"
          onClick={onOpenAddModal}
          className="px-5 py-3 rounded-full bg-[#2E7D60] text-white font-bold text-xs shadow-sm hover:bg-[#23634B] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Despesa</span>
        </button>
      </div>

      {/* Split Balances */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <h2 className="font-serif font-bold text-base text-[#2D2621] mb-3">Rateio entre a Família</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {splitBalances.map(b => (
            <div key={b.name} className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#2D2621]">{b.name}</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    b.balance > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : b.balance < 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-[#E6DEC6] text-[#4A423B]"
                  }`}
                >
                  {b.balance > 0 ? "A receber" : b.balance < 0 ? "A pagar" : "Em dia"}
                </span>
              </div>
              <p className="text-base font-serif font-bold text-[#2D2621] mt-2">
                R$ {Math.abs(b.balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses History */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#E6DEC6]">
        <h2 className="font-serif font-bold text-lg text-[#2D2621] mb-4">Extrato de Despesas</h2>

        <div className="space-y-3">
          {expenses.map(exp => (
            <div
              key={exp.id}
              className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DEC6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8F4F0] text-[#2E7D60] flex items-center justify-center shrink-0 mt-0.5">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#2D2621]">{exp.title}</h3>
                  <p className="text-xs text-[#786E65]">
                    {exp.category} • Pago por <strong className="text-[#2D2621]">{exp.paid_by || exp.paid_by_name}</strong> em {exp.date}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {Object.entries(exp.split_status || {}).map(([mem, status]) => (
                      <button
                        key={mem}
                        onClick={() => handleToggleStatus(exp.id, mem)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all flex items-center gap-1 ${
                          status === "pago"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        {status === "pago" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{mem}: {status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right self-end sm:self-center">
                <span className="font-serif font-bold text-base text-[#2D2621] block">
                  R$ {exp.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-[#786E65]">Dividido em 3 partes</span>
              </div>
            </div>
          ))}

          {expenses.length === 0 && (
            <p className="text-sm text-[#786E65] text-center py-6">Nenhuma despesa cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
};
