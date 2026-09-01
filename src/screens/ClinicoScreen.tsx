import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, MapPin, Phone, User, Check, Edit2, Save } from 'lucide-react';

export const ClinicoScreen: React.FC = () => {
  const { elder, refreshData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bloodType, setBloodType] = useState(elder?.blood_type || 'O+');
  const [allergies, setAllergies] = useState(elder?.allergies?.join(', ') || 'Dipirona');
  const [insurance, setInsurance] = useState(elder?.health_insurance || 'Bradesco Saúde Top');
  const [insuranceNumber, setInsuranceNumber] = useState(elder?.health_insurance_number || '982.341.002.88');
  const [doctorName, setDoctorName] = useState(elder?.doctor_name || 'Dra. Cecília Mendes (Geriatra)');
  const [doctorPhone, setDoctorPhone] = useState(elder?.doctor_phone || '(21) 98844-3321');
  const [address, setAddress] = useState(elder?.address || 'Rua das Laranjeiras, 420, Apto 502, Rio de Janeiro - RJ');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blood_type: bloodType,
          allergies: allergies.split(',').map((s: string) => s.trim()),
          health_insurance: insurance,
          health_insurance_number: insuranceNumber,
          doctor_name: doctorName,
          doctor_phone: doctorPhone,
          address,
        }),
      });
      await refreshData();
      setIsEditing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Header Banner */}
      <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="bg-[#EBF0E6] text-[#465538] text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Ficha da Mãe
            </span>
            <h2 className="font-display text-2xl font-bold text-[#3E2F25] mt-1.5">
              Informações Essenciais do Cuidado
            </h2>
            <p className="text-xs sm:text-sm text-[#6B5A4C] mt-0.5">
              Dados fundamentais de <strong>{elder?.name || "Helena Schaun"}</strong> para a família e socorristas.
            </p>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="self-start sm:self-auto text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-4 py-2 rounded-xl transition-all border border-[#8A9E74]/30 flex items-center gap-1.5"
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            {isEditing ? "Concluir Edição" : "Editar Ficha"}
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-3 p-3 bg-[#EBF0E6] border border-[#8A9E74] rounded-xl text-xs font-bold text-[#465538] flex items-center gap-2">
            <Check className="w-4 h-4 text-[#5C6E49]" />
            Ficha atualizada com sucesso!
          </div>
        )}
      </section>

      {/* Main Details */}
      <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 space-y-6">
        
        {/* Identificação */}
        <div className="space-y-3">
          <h3 className="font-display font-bold text-base text-[#3E2F25] flex items-center gap-2 border-b border-[#EAE0D3] pb-2">
            <User className="w-4 h-4 text-[#5C6E49]" />
            Identificação
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[#6B5A4C] block font-medium">Nome Completo:</span>
              <strong className="text-[#3E2F25] text-sm block mt-0.5">{elder?.name || "Helena Schaun"}</strong>
            </div>
            <div>
              <span className="text-[#6B5A4C] block font-medium">Como gosta de ser chamada:</span>
              <strong className="text-[#3E2F25] text-sm block mt-0.5">{elder?.nickname || "Dona Helena"}</strong>
            </div>
            <div>
              <span className="text-[#6B5A4C] block font-medium">Idade:</span>
              <strong className="text-[#3E2F25] text-sm block mt-0.5">{elder?.age || 78} anos (12/04/1948)</strong>
            </div>
          </div>
        </div>

        {/* Informações Clínicas Críticas */}
        <div className="space-y-3">
          <h3 className="font-display font-bold text-base text-[#3E2F25] flex items-center gap-2 border-b border-[#EAE0D3] pb-2">
            <Heart className="w-4 h-4 text-[#C4633F]" />
            Atenção Especial & Emergência
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#F7F0E6] p-3.5 rounded-xl space-y-1">
              <span className="text-[#6B5A4C] block font-medium">Tipo Sanguíneo:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={bloodType}
                  onChange={e => setBloodType(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-[#EAE0D3] rounded"
                />
              ) : (
                <strong className="text-sm font-bold text-[#A9402E]">{bloodType}</strong>
              )}
            </div>

            <div className="bg-[#F7F0E6] p-3.5 rounded-xl space-y-1">
              <span className="text-[#6B5A4C] block font-medium">Alergias Conhecidas:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-[#EAE0D3] rounded"
                />
              ) : (
                <strong className="text-sm font-bold text-[#A9402E]">{allergies}</strong>
              )}
            </div>
          </div>
        </div>

        {/* Convênio e Médica de Referência */}
        <div className="space-y-3">
          <h3 className="font-display font-bold text-base text-[#3E2F25] flex items-center gap-2 border-b border-[#EAE0D3] pb-2">
            <Phone className="w-4 h-4 text-[#5C6E49]" />
            Convênio & Médica de Confiança
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#F7F0E6] p-3.5 rounded-xl space-y-1">
              <span className="text-[#6B5A4C] block font-medium">Plano de Saúde:</span>
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={insurance}
                    onChange={e => setInsurance(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-[#EAE0D3] rounded"
                  />
                  <input
                    type="text"
                    value={insuranceNumber}
                    onChange={e => setInsuranceNumber(e.target.value)}
                    placeholder="Número da carteirinha"
                    className="w-full text-xs p-1.5 bg-white border border-[#EAE0D3] rounded"
                  />
                </div>
              ) : (
                <>
                  <strong className="text-sm text-[#3E2F25] block">{insurance}</strong>
                  <span className="text-[11px] text-[#6B5A4C]">Carteirinha: {insuranceNumber}</span>
                </>
              )}
            </div>

            <div className="bg-[#F7F0E6] p-3.5 rounded-xl space-y-1">
              <span className="text-[#6B5A4C] block font-medium">Médica de Referência:</span>
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-[#EAE0D3] rounded"
                  />
                  <input
                    type="text"
                    value={doctorPhone}
                    onChange={e => setDoctorPhone(e.target.value)}
                    placeholder="Telefone da médica"
                    className="w-full text-xs p-1.5 bg-white border border-[#EAE0D3] rounded"
                  />
                </div>
              ) : (
                <>
                  <strong className="text-sm text-[#3E2F25] block">{doctorName}</strong>
                  <a href={`tel:${doctorPhone.replace(/\D/g, '')}`} className="text-xs text-[#5C6E49] font-semibold hover:underline block">
                    {doctorPhone}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-2 text-xs">
          <span className="text-[#6B5A4C] block font-medium">Endereço da Residência:</span>
          {isEditing ? (
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full text-xs p-2 bg-[#F7F0E6] border border-[#EAE0D3] rounded-xl"
            />
          ) : (
            <div className="p-3 bg-[#F7F0E6] rounded-xl flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C4633F] shrink-0" />
              <span className="text-[#3E2F25] font-semibold">{address}</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
