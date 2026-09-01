import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CircleMember } from '../types';
import { Users, Share2, Copy, Check, UserPlus, Phone } from 'lucide-react';

export const CirculoScreen: React.FC = () => {
  const { elder } = useAuth();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [inviteCode, setInviteCode] = useState('AMPARAI-SCHAUN-2026');
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // New member form
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [role, setRole] = useState<'coordenador' | 'familiar' | 'cuidador'>('familiar');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isEmergency, setIsEmergency] = useState(true);
  const [pixKey, setPixKey] = useState('');

  const loadCircle = async () => {
    try {
      const res = await fetch('/api/circle');
      if (res.ok) {
        const json = await res.json();
        setMembers(json.members || []);
        if (json.invite_code) setInviteCode(json.invite_code);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCircle();
  }, []);

  const handleCopyInvite = () => {
    const link = `${window.location.origin}/convite/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      await fetch('/api/circle/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          relation,
          role,
          phone,
          email,
          is_emergency_contact: isEmergency,
          pix_key: pixKey,
        }),
      });
      setName('');
      setRelation('');
      setPhone('');
      setEmail('');
      setPixKey('');
      setShowInviteForm(false);
      loadCircle();
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
              Círculo de Cuidado
            </span>
            <h2 className="font-display text-2xl font-bold text-[#3E2F25] mt-1.5">
              Família & Cuidadores
            </h2>
            <p className="text-xs sm:text-sm text-[#6B5A4C] mt-0.5">
              Pessoas que participam da rotina de carinho com <strong>{elder?.nickname || "Dona Helena"}</strong>.
            </p>
          </div>

          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="self-start sm:self-auto text-xs font-bold text-white bg-[#5C6E49] hover:bg-[#465538] px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar ao Círculo
          </button>
        </div>
      </section>

      {/* Quick Invite Link */}
      <section className="bg-gradient-to-r from-[#F7F0E6] to-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5C6E49] text-white flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[#3E2F25]">Link de Convite da Família</h4>
            <p className="text-xs text-[#6B5A4C]">Compartilhe no WhatsApp com irmãos e cuidadores</p>
          </div>
        </div>

        <button
          onClick={handleCopyInvite}
          className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#F7F0E6] rounded-xl text-xs font-bold text-[#5C6E49] border border-[#EAE0D3] flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#5C6E49]" />
              <span>Link Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#6B5A4C]" />
              <span>Copiar Link de Convite</span>
            </>
          )}
        </button>
      </section>

      {/* Add Member Form */}
      {showInviteForm && (
        <form onSubmit={handleAddMember} className="bg-[#FFFDF9] border border-[#5C6E49]/40 p-5 rounded-2xl space-y-4 shadow-sm">
          <h3 className="font-display font-bold text-base text-[#3E2F25]">
            Convidar Novo Membro para o Círculo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3E2F25] mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Mariana Schaun, Clara Santos"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3E2F25] mb-1">Parentesco / Vínculo</label>
              <input
                type="text"
                required
                value={relation}
                onChange={e => setRelation(e.target.value)}
                placeholder="Ex: Filha, Cuidadora Seg-Sex, Vizinha"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3E2F25] mb-1">Papel</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
              >
                <option value="coordenador">Coordenador (Gestão total)</option>
                <option value="familiar">Familiar (Acesso completo)</option>
                <option value="cuidador">Cuidador (Rotina e notas)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3E2F25] mb-1">Telefone / WhatsApp</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(21) 99999-9999"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3E2F25] mb-1">Chave PIX (Para acertos)</label>
              <input
                type="text"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                placeholder="E-mail, CPF ou celular"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isEmergencyCheck"
              checked={isEmergency}
              onChange={e => setIsEmergency(e.target.checked)}
              className="rounded text-[#5C6E49] focus:ring-[#5C6E49]"
            />
            <label htmlFor="isEmergencyCheck" className="text-xs text-[#3E2F25] font-medium">
              Incluir como contato de emergência rápida no botão SOS
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE0D3]">
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B5A4C]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5C6E49] text-white hover:bg-[#465538]"
            >
              Salvar Membro
            </button>
          </div>
        </form>
      )}

      {/* Members Grid */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-[#3E2F25] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#5C6E49]" />
          Membros do Círculo ({members.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map(member => (
            <div key={member.id} className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EBF0E6] text-[#5C6E49] font-bold flex items-center justify-center border border-[#8A9E74]/30">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[#3E2F25]">{member.name}</h4>
                    <p className="text-xs text-[#6B5A4C]">{member.relation}</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  member.role === 'coordenador'
                    ? 'bg-[#5C6E49] text-white'
                    : member.role === 'cuidador'
                    ? 'bg-[#FFF9F0] text-[#E8A854] border border-[#E8A854]'
                    : 'bg-[#F7F0E6] text-[#3E2F25]'
                }`}>
                  {member.role}
                </span>
              </div>

              <div className="pt-2 border-t border-[#EAE0D3] flex flex-wrap items-center justify-between gap-2 text-xs">
                {member.phone && (
                  <a
                    href={`tel:${member.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-1.5 text-[#5C6E49] font-semibold hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {member.phone}
                  </a>
                )}

                {member.is_emergency_contact && (
                  <span className="text-[10px] font-bold text-[#A9402E] bg-[#A9402E]/10 px-2 py-0.5 rounded">
                    Contato SOS
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
