import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MedBagDocument } from '../types';
import { 
  FolderLock, 
  FileText, 
  UploadCloud, 
  Share2, 
  Calendar, 
  Search, 
  Filter, 
  Check, 
  ExternalLink, 
  Lock, 
  FileCheck,
  Stethoscope,
  Clock,
  X,
  Copy
} from 'lucide-react';

export const MedBagSection: React.FC = () => {
  const { elder } = useAuth();
  const [documents, setDocuments] = useState<MedBagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDoctorLinkModal, setShowDoctorLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // New Doc Form
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'receita' | 'exame' | 'laudo' | 'vacina' | 'outro'>('receita');
  const [docDoctor, setDocDoctor] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [docSummary, setDocSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error("Erro ao buscar documentos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          category: docCategory,
          doctor_name: docDoctor || elder?.doctor_name,
          specialty: docSpecialty || "Clínica Geral",
          date: new Date(docDate).toLocaleDateString('pt-BR'),
          summary: docSummary,
          file_type: 'pdf',
        }),
      });

      if (res.ok) {
        setUploadSuccess(true);
        await fetchDocuments();
        setTimeout(() => {
          setShowUploadModal(false);
          setDocTitle('');
          setDocDoctor('');
          setDocSpecialty('');
          setDocSummary('');
          setUploadSuccess(false);
        }, 1200);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateDoctorLink = async () => {
    setIsGeneratingLink(true);
    try {
      const res = await fetch('/api/doctor-link/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGeneratedLink(data.link);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    const fullUrl = `${window.location.origin}${generatedLink.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCat = selectedCategory === 'todos' || doc.category === selectedCategory;
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.doctor_name && doc.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.summary && doc.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'receita':
        return <span className="bg-[#FFF9F0] text-[#C4633F] border border-[#C4633F]/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Receita</span>;
      case 'exame':
        return <span className="bg-[#EBF0E6] text-[#465538] border border-[#8A9E74]/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Exame</span>;
      case 'laudo':
        return <span className="bg-[#F0EBF5] text-[#6E4975] border border-[#6E4975]/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Laudo</span>;
      case 'vacina':
        return <span className="bg-[#E6F3F7] text-[#2C6B7E] border border-[#2C6B7E]/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Vacina</span>;
      default:
        return <span className="bg-[#F7F0E6] text-[#6B5A4C] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Documento</span>;
    }
  };

  return (
    <section className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE0D3] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center shrink-0">
            <FolderLock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#EBF0E6] text-[#465538] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                MedBag & FHIR Ready (D-008)
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#3E2F25] mt-1">
              Pasta de Saúde Digital
            </h3>
            <p className="text-xs text-[#6B5A4C]">
              Receitas, exames e laudos organizados para levar às consultas de {elder?.nickname || "Dona Helena"}.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowDoctorLinkModal(true);
              if (!generatedLink) handleGenerateDoctorLink();
            }}
            className="text-xs font-bold text-[#5C6E49] bg-[#EBF0E6] hover:bg-[#8A9E74]/30 px-3.5 py-2 rounded-xl transition-all border border-[#8A9E74]/30 flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            Link para o Médico
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="text-xs font-bold bg-[#5C6E49] hover:bg-[#465538] text-white px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            Guardar Documento
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A89B8F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por exame, especialidade ou médico..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#EAE0D3] bg-[#F7F0E6]/30 text-[#3E2F25] placeholder-[#A89B8F] focus:outline-none focus:border-[#5C6E49]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'receita', label: 'Receitas' },
            { id: 'exame', label: 'Exames' },
            { id: 'laudo', label: 'Laudos' },
            { id: 'vacina', label: 'Vacinas' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-[#5C6E49] text-white'
                  : 'bg-[#F7F0E6] text-[#6B5A4C] hover:bg-[#EAE0D3]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {loading ? (
          <div className="col-span-full py-8 text-center text-xs text-[#6B5A4C]">
            Carregando pasta de saúde...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-full py-8 text-center bg-[#F7F0E6]/40 rounded-2xl border border-dashed border-[#EAE0D3] space-y-1">
            <FileText className="w-8 h-8 text-[#A89B8F] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#3E2F25]">Nenhum documento encontrado</p>
            <p className="text-[11px] text-[#6B5A4C]">Guarde as fotos de receitas e PDFs de exames para fácil consulta.</p>
          </div>
        ) : (
          filteredDocs.map(doc => (
            <div 
              key={doc.id}
              className="bg-white border border-[#EAE0D3] hover:border-[#8A9E74] rounded-xl p-4 space-y-2.5 transition-all shadow-2xs hover:shadow-xs group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  {getCategoryBadge(doc.category)}
                  <h4 className="font-semibold text-sm text-[#3E2F25] group-hover:text-[#5C6E49] transition-colors line-clamp-1">
                    {doc.title}
                  </h4>
                </div>
                <span className="text-[11px] font-medium text-[#A89B8F] shrink-0">
                  {doc.date}
                </span>
              </div>

              {doc.summary && (
                <p className="text-xs text-[#6B5A4C] bg-[#F7F0E6]/50 p-2 rounded-lg line-clamp-2">
                  {doc.summary}
                </p>
              )}

              <div className="pt-2 border-t border-[#F7F0E6] flex items-center justify-between text-[11px] text-[#6B5A4C]">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#5C6E49]" />
                  <span className="truncate max-w-[140px]">{doc.doctor_name || doc.specialty || "Clínica"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A89B8F]">PDF</span>
                  <button
                    type="button"
                    onClick={() => alert(`Visualização do arquivo: ${doc.title}`)}
                    className="text-[#5C6E49] font-bold hover:underline flex items-center gap-0.5"
                  >
                    Abrir <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE0D3] pb-3">
              <div className="flex items-center gap-2 text-[#5C6E49]">
                <UploadCloud className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-[#3E2F25]">Guardar na Pasta MedBag</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-[#F7F0E6] text-[#6B5A4C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="p-5 bg-[#EBF0E6] text-[#465538] rounded-xl text-xs font-bold text-center flex flex-col items-center gap-2">
                <Check className="w-6 h-6 text-[#5C6E49]" />
                <span>Documento guardado com sucesso na pasta de saúde!</span>
              </div>
            ) : (
              <form onSubmit={handleCreateDocument} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#3E2F25] mb-1">
                    Nome / Título do Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Ex: Receita Dra. Cecília ou Hemograma Agosto"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#3E2F25] mb-1">
                      Categoria
                    </label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
                    >
                      <option value="receita">Receita Médica</option>
                      <option value="exame">Exame (Sangue/Imagem)</option>
                      <option value="laudo">Laudo Especialista</option>
                      <option value="vacina">Carteira de Vacinação</option>
                      <option value="outro">Outro Documento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3E2F25] mb-1">
                      Data do Documento
                    </label>
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#3E2F25] mb-1">
                      Médico / Laboratório
                    </label>
                    <input
                      type="text"
                      value={docDoctor}
                      onChange={(e) => setDocDoctor(e.target.value)}
                      placeholder="Ex: Dra. Cecília Mendes"
                      className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3E2F25] mb-1">
                      Especialidade
                    </label>
                    <input
                      type="text"
                      value={docSpecialty}
                      onChange={(e) => setDocSpecialty(e.target.value)}
                      placeholder="Ex: Geriatria, Cardiologia"
                      className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3E2F25] mb-1">
                    Resumo / Posologia / Principais Conclusões
                  </label>
                  <textarea
                    rows={2}
                    value={docSummary}
                    onChange={(e) => setDocSummary(e.target.value)}
                    placeholder="Ex: Remédios prescritos com horários ou valor da glicose de jejum."
                    className="w-full text-xs p-2.5 rounded-xl border border-[#EAE0D3] bg-white focus:outline-none focus:border-[#5C6E49]"
                  />
                </div>

                {/* Upload Placeholder Box */}
                <div className="p-4 border-2 border-dashed border-[#8A9E74]/40 rounded-xl bg-[#F7F0E6]/30 text-center space-y-1">
                  <FileCheck className="w-6 h-6 text-[#5C6E49] mx-auto" />
                  <p className="text-xs font-semibold text-[#3E2F25]">PDF ou Foto da Receita</p>
                  <span className="text-[10px] text-[#6B5A4C] block">Criptografado e armazenado com segurança (LGPD Art. 11)</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="text-xs font-semibold px-4 py-2 rounded-xl text-[#6B5A4C] hover:bg-[#F7F0E6]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-[#5C6E49] hover:bg-[#465538] text-white disabled:opacity-40 transition-all shadow-xs"
                  >
                    {isSubmitting ? "Salvando..." : "Guardar Documento"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Doctor Quick Link Modal (D-009) */}
      {showDoctorLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#EAE0D3] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#EAE0D3] pb-3">
              <div className="flex items-center gap-2 text-[#5C6E49]">
                <Share2 className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-[#3E2F25]">Link para o Médico (D-009)</h3>
              </div>
              <button
                onClick={() => setShowDoctorLinkModal(false)}
                className="p-1 rounded-lg hover:bg-[#F7F0E6] text-[#6B5A4C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6B5A4C] leading-relaxed">
              Gere uma página de consulta rápida e segura com validade temporária de <strong>24 horas</strong> para enviar ao médico no WhatsApp ou abrir no consultório.
            </p>

            {isGeneratingLink ? (
              <div className="py-6 text-center text-xs text-[#6B5A4C]">Gerando link seguro...</div>
            ) : generatedLink ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#EBF0E6] border border-[#8A9E74]/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#465538] font-bold">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-[#5C6E49]" /> Link Temporário Ativo
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Válido por 24h
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}${generatedLink.url}`}
                      className="w-full text-xs font-mono p-2 bg-white border border-[#EAE0D3] rounded-lg text-[#3E2F25] select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="shrink-0 p-2 bg-[#5C6E49] text-white rounded-lg hover:bg-[#465538] transition-colors"
                      title="Copiar link"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#6B5A4C]">
                  <p className="font-semibold text-[#3E2F25]">O médico poderá visualizar:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Lista de medicamentos contínuos e dosagens ativas</li>
                    <li>Alergias e tipo sanguíneo ({elder?.blood_type || 'O+'})</li>
                    <li>Últimas medições de pressão e glicose</li>
                    <li>Receitas e laudos recentes da pasta MedBag</li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDoctorLinkModal(false)}
                    className="text-xs font-semibold px-4 py-2 rounded-xl text-[#6B5A4C] hover:bg-[#F7F0E6]"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-[#5C6E49] text-white hover:bg-[#465538] flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? "Copiado!" : "Copiar Link"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </section>
  );
};
