import React, { useState, useEffect } from 'react';
import { ShieldCheck, Stethoscope, Pill, Activity, Calendar, Lock, AlertCircle, Heart } from 'lucide-react';

interface DoctorPortalProps {
  token?: string;
  onBackToApp?: () => void;
}

export const DoctorPortalScreen: React.FC<DoctorPortalProps> = ({ token = 'demo-consulta', onBackToApp }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/doctor-link/${token}`);
        if (!res.ok) {
          throw new Error("Link expirado ou inválido.");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados médicos.");
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F0E6] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-3 border-[#5C6E49] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#3E2F25]">Carregando prontuário compartilhado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F0E6] flex items-center justify-center p-4">
        <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-6 max-w-md w-full text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#A9402E] mx-auto" />
          <h2 className="font-display text-lg font-bold text-[#3E2F25]">Acesso Indisponível</h2>
          <p className="text-xs text-[#6B5A4C]">{error}</p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="text-xs font-bold px-4 py-2 bg-[#5C6E49] text-white rounded-xl"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>
    );
  }

  const { elder, active_medications, recent_vitals, recent_documents } = data;

  return (
    <div className="min-h-screen bg-[#F7F0E6] text-[#3E2F25] p-4 sm:p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6">
        
        {/* Top Medical Banner */}
        <header className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Prontuário Rápido Amparai
                </span>
                <span className="text-[10px] text-[#5C6E49] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Acesso Médico Temporário (D-009)
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-[#3E2F25] mt-1">
                {elder?.name || "Helena Schaun"} ({elder?.nickname || "Dona Helena"})
              </h1>
              <p className="text-xs text-[#6B5A4C]">
                {elder?.age || 78} anos • Convênio: <strong>{elder?.health_insurance || "Bradesco Saúde"}</strong> (Nº {elder?.health_insurance_number || "982.341.002.88"})
              </p>
            </div>
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3.5 py-2 rounded-xl border border-[#8A9E74]/30 transition-all self-start sm:self-auto"
            >
              Voltar ao App
            </button>
          )}
        </header>

        {/* Emergency & Critical Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B5A4C]">Tipo Sanguíneo</span>
            <p className="font-display text-xl font-bold text-[#A9402E]">{elder?.blood_type || "O+"}</p>
          </div>

          <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B5A4C]">Alergias Medicamentosas</span>
            <p className="font-display text-base font-bold text-[#A9402E]">
              {Array.isArray(elder?.allergies) ? elder.allergies.join(', ') : (elder?.allergies || "Dipirona")}
            </p>
          </div>
        </div>

        {/* Active Medications List */}
        <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#EAE0D3] pb-3">
            <Pill className="w-5 h-5 text-[#C4633F]" />
            <h2 className="font-display text-lg font-bold text-[#3E2F25]">Medicamentos em Uso Contínuo</h2>
          </div>

          <div className="space-y-3">
            {active_medications?.map((med: any) => (
              <div key={med.id} className="p-3.5 bg-[#F7F0E6]/50 rounded-xl border border-[#EAE0D3] flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#3E2F25]">{med.name}</h4>
                  <p className="text-xs text-[#6B5A4C]">{med.dosage}</p>
                  {med.instructions && (
                    <p className="text-[11px] text-[#6B5A4C] mt-1 italic">Orientação: {med.instructions}</p>
                  )}
                </div>
                <div className="text-right text-xs">
                  <span className="bg-[#EBF0E6] text-[#465538] font-bold px-2 py-0.5 rounded-full">
                    {med.schedule_times ? med.schedule_times.join(', ') : (med.time || '08:00')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Vitals */}
        <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#EAE0D3] pb-3">
            <Activity className="w-5 h-5 text-[#5C6E49]" />
            <h2 className="font-display text-lg font-bold text-[#3E2F25]">Últimas Medições Clínicas</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recent_vitals?.map((v: any) => (
              <div key={v.id} className="p-3.5 bg-[#F7F0E6]/40 rounded-xl border border-[#EAE0D3]">
                <span className="text-[10px] font-bold text-[#6B5A4C] uppercase tracking-wider block">
                  {v.type === 'pressao' ? 'Pressão Arterial' : v.type === 'glicemia' ? 'Glicemia' : 'Saturação O2'}
                </span>
                <strong className="text-base text-[#3E2F25] block mt-0.5">{v.value || v.detail}</strong>
                <span className="text-[10px] text-[#A89B8F]">{v.date} às {v.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Documents & Tests */}
        <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#EAE0D3] pb-3">
            <Calendar className="w-5 h-5 text-[#5C6E49]" />
            <h2 className="font-display text-lg font-bold text-[#3E2F25]">Exames e Laudos Recentes (MedBag)</h2>
          </div>

          <div className="space-y-2.5">
            {recent_documents?.map((doc: any) => (
              <div key={doc.id} className="p-3 bg-white border border-[#EAE0D3] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#3E2F25]">{doc.title}</h4>
                  <p className="text-[11px] text-[#6B5A4C]">{doc.summary || `${doc.doctor_name || 'Médico'} • ${doc.date}`}</p>
                </div>
                <span className="text-[11px] font-semibold text-[#5C6E49] bg-[#EBF0E6] px-2.5 py-1 rounded-lg">
                  {doc.category.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Security & LGPD Disclaimer */}
        <footer className="text-center text-xs text-[#6B5A4C] space-y-1 p-4">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-[#5C6E49]">
            <ShieldCheck className="w-4 h-4" />
            Amparai • Cuidado em Círculo
          </div>
          <p className="text-[11px] text-[#A89B8F]">
            {data.security_notice || "Prontuário compartilhado pela família sob consentimento e proteção de dados."}
          </p>
        </footer>

      </div>
    </div>
  );
};
