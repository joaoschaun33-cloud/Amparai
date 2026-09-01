import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Medication, MedicalAppointment, VitalMeasurement } from '../types';
import { Pill, Calendar, Activity, Clock, FileText } from 'lucide-react';

export const SaudeScreen: React.FC = () => {
  const { elder, openAddCare } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [vitalType, setVitalType] = useState<'pressao' | 'glicemia' | 'saturacao'>('pressao');
  const [vitalValue, setVitalValue] = useState('');

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health');
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
    loadHealthData();
  }, []);

  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalValue) return;

    try {
      await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: vitalType, value: vitalValue }),
      });
      setVitalValue('');
      setShowVitalForm(false);
      loadHealthData();
    } catch (e) {
      console.error(e);
    }
  };

  const medications: Medication[] = data?.medications || [];
  const appointments: MedicalAppointment[] = data?.appointments || [];
  const vitals: VitalMeasurement[] = data?.vitals || [];

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Top Banner */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="bg-[#EBF0E6] text-[#465538] text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Saúde & Bem-Estar
            </span>
            <h2 className="font-display text-2xl font-bold text-[#3E2F25] mt-1.5">
              Remédios, Consultas e Medições
            </h2>
            <p className="text-xs sm:text-sm text-[#6B5A4C] mt-1">
              Informações de saúde de <strong>{elder?.nickname || "Dona Helena"}</strong> organizadas em um só lugar seguro.
            </p>
          </div>
        </div>
      </section>

      {/* 1. Medições Recentes (Pressão, Glicemia, etc.) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[#3E2F25] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#5C6E49]" />
            Registros de Bem-Estar
          </h3>
          <button
            onClick={() => setShowVitalForm(!showVitalForm)}
            className="text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3 py-1.5 rounded-xl border border-[#8A9E74]/30 transition-colors"
          >
            + Registrar Medição
          </button>
        </div>

        {showVitalForm && (
          <form onSubmit={handleAddVital} className="bg-[#FFFDF9] border border-[#5C6E49]/40 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-[#3E2F25]">Nova Medição</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#6B5A4C] mb-1">Tipo</label>
                <select
                  value={vitalType}
                  onChange={e => setVitalType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                >
                  <option value="pressao">Pressão Arterial</option>
                  <option value="glicemia">Glicemia</option>
                  <option value="saturacao">Saturação O2</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B5A4C] mb-1">Valor</label>
                <input
                  type="text"
                  required
                  value={vitalValue}
                  onChange={e => setVitalValue(e.target.value)}
                  placeholder="Ex: 12/8 mmHg, 98 mg/dL"
                  className="w-full text-xs p-2 rounded-lg border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVitalForm(false)}
                className="text-xs text-[#6B5A4C] px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="text-xs font-bold bg-[#5C6E49] text-white px-4 py-1.5 rounded-lg"
              >
                Salvar
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {vitals.map(v => (
            <div key={v.id} className="bg-[#FFFDF9] border border-[#EAE0D3] p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-[#6B5A4C] uppercase tracking-wider block">
                {v.type === 'pressao' || v.kind === 'pressao' ? 'Pressão Arterial' : v.type === 'glicemia' ? 'Glicemia' : 'Saturação de Oxigênio'}
              </span>
              <span className="font-display font-bold text-xl text-[#3E2F25] block">
                {v.value || v.detail}
              </span>
              <span className="text-[11px] text-[#A89B8F] block">
                {v.date} às {v.time} por {v.measured_by || v.author_name || 'Família'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Medicamentos de Uso Contínuo */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[#3E2F25] flex items-center gap-2">
            <Pill className="w-5 h-5 text-[#C4633F]" />
            Medicamentos em Uso
          </h3>
          <button
            onClick={() => openAddCare('remedio')}
            className="text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3 py-1.5 rounded-xl border border-[#8A9E74]/30 transition-colors"
          >
            + Novo Remédio
          </button>
        </div>

        <div className="space-y-3">
          {medications.map(med => (
            <div key={med.id} className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-[#3E2F25]">{med.name}</h4>
                  <p className="text-xs text-[#6B5A4C] font-medium">{med.dosage}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  (med.stock_days_left ?? 30) <= 15
                    ? 'bg-[#FFF9F0] text-[#E8A854] border border-[#E8A854]'
                    : 'bg-[#EBF0E6] text-[#465538]'
                }`}>
                  Estoque: ~{med.stock_days_left ?? 30} dias
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#6B5A4C]">
                <div className="flex items-center gap-1 bg-[#F7F0E6] px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-[#5C6E49]" />
                  <span>Horários: <strong>{med.schedule_times ? med.schedule_times.join(', ') : (med.time || '08:00')}</strong></span>
                </div>
                <div className="flex items-center gap-1 bg-[#F7F0E6] px-2.5 py-1 rounded-lg">
                  <FileText className="w-3.5 h-3.5 text-[#C4633F]" />
                  <span>Receita com: <strong>{med.prescription_holder || 'Juliana'}</strong></span>
                </div>
              </div>

              {med.instructions && (
                <p className="text-xs text-[#6B5A4C] bg-[#F7F0E6]/50 p-2 rounded-lg">
                  Orientação: {med.instructions}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. Consultas e Exames Agendados */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-[#3E2F25] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#5C6E49]" />
          Consultas & Exames Agendados
        </h3>

        <div className="space-y-3">
          {appointments.map(app => (
            <div key={app.id} className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    {app.specialty || 'Especialista'}
                  </span>
                  <h4 className="font-semibold text-sm sm:text-base text-[#3E2F25] mt-1">{app.doctor || app.title}</h4>
                  <p className="text-xs text-[#6B5A4C]">{app.location}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#5C6E49] block">
                    {app.date ? new Date(app.date).toLocaleDateString('pt-BR') : ''} às {app.time}
                  </span>
                  <span className="text-[11px] text-[#6B5A4C]">Acompanha: {app.companion || 'Família'}</span>
                </div>
              </div>

              {app.notes && (
                <p className="text-xs text-[#6B5A4C] bg-[#F7F0E6] p-2.5 rounded-lg">
                  {app.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
