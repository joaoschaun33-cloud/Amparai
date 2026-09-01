import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// --- Database In-Memory Store with Realistic Initial Family State ---
const elderProfile = {
  id: "elder-1",
  name: "Helena Schaun",
  nickname: "Dona Helena",
  age: 78,
  birth_date: "1948-04-12",
  blood_type: "O+",
  allergies: ["Dipirona"],
  vital_conditions: ["Atenção à hidratação nos dias quentes", "Uso de óculos para leitura"],
  address: "Rua das Laranjeiras, 420, Apto 502, Rio de Janeiro - RJ",
  cep: "22240-006",
  health_insurance: "Bradesco Saúde Top",
  health_insurance_number: "982.341.002.88",
  doctor_name: "Dra. Cecília Mendes (Geriatra)",
  doctor_phone: "(21) 98844-3321",
  created_at: new Date().toISOString(),
};

let routineItems = [
  {
    id: "r-1",
    title: "Losartana 50mg + Café da manhã",
    period: "manha" as const,
    time: "08:00",
    category: "medicamento" as const,
    dosage: "1 comprimido",
    completed: true,
    completed_at: "08:15",
    completed_by: "Juliana (Filha)",
    notes: "Comeu bem, tomou com suco de laranja natural.",
  },
  {
    id: "r-2",
    title: "Caminhada no jardim do prédio",
    period: "manha" as const,
    time: "09:30",
    category: "bem_estar" as const,
    completed: true,
    completed_at: "09:40",
    completed_by: "Juliana (Filha)",
    notes: "Deu 3 voltas e conversou com os vizinhos.",
  },
  {
    id: "r-3",
    title: "Almoço equilibrado e hidratação",
    period: "tarde" as const,
    time: "12:30",
    category: "alimentacao" as const,
    completed: true,
    completed_at: "12:45",
    completed_by: "Clara (Cuidadora)",
    notes: "Prato todo consumido, 300ml de água.",
  },
  {
    id: "r-4",
    title: "Vitamina D 2.000 UI",
    period: "tarde" as const,
    time: "14:00",
    category: "medicamento" as const,
    dosage: "4 gotas",
    completed: false,
    notes: "Aguardando horário.",
  },
  {
    id: "r-5",
    title: "Lanche da tarde & Leitura",
    period: "tarde" as const,
    time: "16:30",
    category: "alimentacao" as const,
    completed: false,
  },
  {
    id: "r-6",
    title: "Jantar leve + Cálcio 600mg",
    period: "noite" as const,
    time: "19:30",
    category: "medicamento" as const,
    dosage: "1 comprimido",
    completed: false,
  },
  {
    id: "r-7",
    title: "Chá de camomila & Preparação para dormir",
    period: "noite" as const,
    time: "21:30",
    category: "bem_estar" as const,
    completed: false,
  },
];

let dailyNotes = [
  {
    id: "dn-1",
    author_name: "Juliana Schaun",
    author_role: "Filha (Coordenadora)",
    content: "Dona Helena acordou super disposta e de bom humor hoje! Fez a caminhada e tomou os remédios matinais certinho.",
    created_at: "Hoje às 10:15",
    mood: "animada" as const,
  },
  {
    id: "dn-2",
    author_name: "Clara Santos",
    author_role: "Cuidadora Diurna",
    content: "Almoço foi muito tranquilo. Ela bebeu bastante água e agora está descansando na sala ouvindo rádio.",
    created_at: "Hoje às 13:20",
    mood: "tranquila" as const,
  },
];

let circleMembers = [
  {
    id: "m-1",
    name: "Juliana Schaun",
    relation: "Filha",
    role: "coordenador" as const,
    phone: "(21) 99876-1234",
    email: "juliana.schaun@email.com",
    is_emergency_contact: true,
    pix_key: "juliana.schaun@email.com",
  },
  {
    id: "m-2",
    name: "Rodrigo Schaun",
    relation: "Filho",
    role: "familiar" as const,
    phone: "(11) 98765-4321",
    email: "rodrigo.schaun@email.com",
    is_emergency_contact: true,
    pix_key: "(11) 98765-4321",
  },
  {
    id: "m-3",
    name: "Mariana Schaun",
    relation: "Filha",
    role: "familiar" as const,
    phone: "(21) 97654-3210",
    email: "mariana.schaun@email.com",
    is_emergency_contact: true,
    pix_key: "123.456.789-00",
  },
  {
    id: "m-4",
    name: "Clara Santos",
    relation: "Cuidadora de Seg a Sex",
    role: "cuidador" as const,
    phone: "(21) 96543-2109",
    email: "clara.cuidados@email.com",
    is_emergency_contact: true,
    pix_key: "clara.pix@email.com",
  },
  {
    id: "m-5",
    name: "Dona Neide (Vizinha de frente)",
    relation: "Apoio de emergência no prédio",
    role: "familiar" as const,
    phone: "(21) 95432-1098",
    is_emergency_contact: true,
  },
];

let shifts = [
  {
    id: "s-1",
    date: new Date().toISOString().split('T')[0],
    caregiver_id: "m-4",
    caregiver_name: "Clara Santos",
    period: "integral" as const,
    status: "confirmado" as const,
    notes: "Plantão diurno das 08h às 18h.",
  },
  {
    id: "s-2",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    caregiver_id: "m-4",
    caregiver_name: "Clara Santos",
    period: "integral" as const,
    status: "confirmado" as const,
  },
  {
    id: "s-3",
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    caregiver_id: "m-1",
    caregiver_name: "Juliana Schaun",
    period: "manha" as const,
    status: "confirmado" as const,
    notes: "Sábado de manhã com a mãe.",
  },
  {
    id: "s-4",
    date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    caregiver_id: "m-2",
    caregiver_name: "Rodrigo Schaun",
    period: "integral" as const,
    status: "folga" as const,
    notes: "Domingo em família.",
  },
  {
    id: "s-5",
    date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    caregiver_id: "m-4",
    caregiver_name: "Clara Santos",
    period: "integral" as const,
    status: "troca_solicitada" as const,
    notes: "Consulta médica pessoal de Clara. Mariana cobrirá.",
    substitute_name: "Mariana Schaun",
  },
];

let medications = [
  {
    id: "med-1",
    name: "Losartana Potássica",
    dosage: "50mg - 1x pela manhã",
    schedule_times: ["08:00"],
    stock_days_left: 18,
    instructions: "Tomar em jejum ou após o café da manhã.",
    prescription_holder: "Juliana (com receita digital)",
  },
  {
    id: "med-2",
    name: "Vitamina D (Colecalciferol)",
    dosage: "2.000 UI - 4 gotas",
    schedule_times: ["14:00"],
    stock_days_left: 32,
    instructions: "Pingar direto na colher com água ou suco.",
    prescription_holder: "Rodrigo",
  },
  {
    id: "med-3",
    name: "Carbonato de Cálcio",
    dosage: "600mg - 1 comprimido",
    schedule_times: ["19:30"],
    stock_days_left: 12,
    instructions: "Após o jantar para melhor absorção.",
    prescription_holder: "Juliana",
  },
  {
    id: "med-4",
    name: "Colírio Lubrificante",
    dosage: "1 gota em cada olho",
    schedule_times: ["10:00", "18:00"],
    stock_days_left: 25,
    instructions: "Aplicar com as mãos bem higienizadas.",
    prescription_holder: "Na farmacinha da mãe",
  },
];

let medicalAppointments = [
  {
    id: "app-1",
    specialty: "Geriatria de Acompanhamento",
    doctor: "Dra. Cecília Mendes",
    date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    time: "14:30",
    location: "Consultório Copacabana Medical Center",
    companion: "Juliana Schaun",
    notes: "Levar exames de sangue recentes e lista de medicamentos atualizada.",
  },
  {
    id: "app-2",
    specialty: "Oftalmologia de Rotina",
    doctor: "Dr. Roberto Caldas",
    date: new Date(Date.now() + 86400000 * 18).toISOString().split('T')[0],
    time: "10:00",
    location: "Clínica de Olhos Botafogo",
    companion: "Mariana Schaun",
    notes: "Revisão do grau dos óculos.",
  },
];

let vitalMeasurements = [
  {
    id: "vm-1",
    type: "pressao" as const,
    value: "12/8 mmHg",
    date: "Hoje",
    time: "08:30",
    measured_by: "Juliana (Filha)",
  },
  {
    id: "vm-2",
    type: "glicemia" as const,
    value: "96 mg/dL",
    date: "Hoje",
    time: "08:15",
    measured_by: "Juliana (Filha)",
  },
  {
    id: "vm-3",
    type: "saturacao" as const,
    value: "98% (ar ambiente)",
    date: "Ontem",
    time: "19:00",
    measured_by: "Clara (Cuidadora)",
  },
];

let expenses = [
  {
    id: "exp-1",
    title: "Farmácia Pacheco - Remédios do Mês",
    category: "farmacia" as const,
    amount: 342.80,
    paid_by_name: "Juliana Schaun",
    paid_by_id: "m-1",
    date: "28/08/2026",
    split_between: ["Juliana Schaun", "Rodrigo Schaun", "Mariana Schaun"],
  },
  {
    id: "exp-2",
    title: "Mensalidade Cuidadora Clara (Quinzena)",
    category: "cuidador" as const,
    amount: 1600.00,
    paid_by_name: "Rodrigo Schaun",
    paid_by_id: "m-2",
    date: "15/08/2026",
    split_between: ["Juliana Schaun", "Rodrigo Schaun", "Mariana Schaun"],
  },
  {
    id: "exp-3",
    title: "Feira e Frutas Especiais",
    category: "compras" as const,
    amount: 185.50,
    paid_by_name: "Mariana Schaun",
    paid_by_id: "m-3",
    date: "25/08/2026",
    split_between: ["Juliana Schaun", "Rodrigo Schaun", "Mariana Schaun"],
  },
  {
    id: "exp-4",
    title: "Exames Laboratoriais Domiciliares",
    category: "consulta" as const,
    amount: 220.00,
    paid_by_name: "Juliana Schaun",
    paid_by_id: "m-1",
    date: "10/08/2026",
    split_between: ["Juliana Schaun", "Rodrigo Schaun", "Mariana Schaun"],
  },
];

let sosEvents: any[] = [];

// --- API Endpoints ---

// Auth & Session
app.get('/api/session', (req: Request, res: Response) => {
  res.json({
    user: {
      user_id: "usr-current",
      email: "familia.schaun@amparai.com",
      name: "Juliana Schaun",
      picture: null,
      role: "coordenador",
    },
    token: "mock-session-token",
    needs_onboarding: false,
    elder_name: elderProfile.name,
    role: "coordenador",
  });
});

app.get('/api/onboarding/status', (req: Request, res: Response) => {
  res.json({
    has_elder: Boolean(elderProfile.name),
    elder_name: elderProfile.name,
    role: "coordenador",
  });
});

app.post('/api/onboarding', (req: Request, res: Response) => {
  const { name, nickname, birth_date, blood_type, allergies, address, doctor_name, doctor_phone } = req.body;
  if (name) elderProfile.name = name;
  if (nickname) elderProfile.nickname = nickname;
  if (birth_date) elderProfile.birth_date = birth_date;
  if (blood_type) elderProfile.blood_type = blood_type;
  if (allergies) elderProfile.allergies = Array.isArray(allergies) ? allergies : [allergies];
  if (address) elderProfile.address = address;
  if (doctor_name) elderProfile.doctor_name = doctor_name;
  if (doctor_phone) elderProfile.doctor_phone = doctor_phone;

  res.json({ success: true, elder: elderProfile });
});

// Today / Dashboard
app.get('/api/today', (req: Request, res: Response) => {
  const completedCount = routineItems.filter(i => i.completed).length;
  const totalCount = routineItems.length;
  const isAllGood = completedCount >= 2;

  res.json({
    elder: elderProfile,
    is_all_good: isAllGood,
    last_checkin: dailyNotes[0]?.created_at || "Hoje de manhã",
    last_checkin_author: dailyNotes[0]?.author_name || "Família",
    routine_progress: {
      completed: completedCount,
      total: totalCount,
      percentage: Math.round((completedCount / totalCount) * 100),
    },
    today_shift: shifts[0],
    routine_items: routineItems,
    daily_notes: dailyNotes,
  });
});

// Routine management
app.post('/api/routine/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const { completedBy, notes } = req.body;
  const item = routineItems.find(r => r.id === id);
  if (!item) {
    return res.status(404).json({ error: "Item de rotina não encontrado" });
  }

  item.completed = !item.completed;
  if (item.completed) {
    const now = new Date();
    item.completed_at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    item.completed_by = completedBy || "Juliana (Filha)";
    if (notes) item.notes = notes;
  } else {
    item.completed_at = undefined;
    item.completed_by = undefined;
  }

  res.json({ success: true, item });
});

app.post('/api/routine', (req: Request, res: Response) => {
  const { title, period, time, category, dosage, description } = req.body;
  if (!title || !period || !time) {
    return res.status(400).json({ error: "Dados incompletos para o item de rotina" });
  }

  const newItem = {
    id: `r-${Date.now()}`,
    title,
    period,
    time,
    category: category || "bem_estar",
    dosage,
    description,
    completed: false,
  };

  routineItems.push(newItem);
  res.json({ success: true, item: newItem });
});

// Daily Notes / Passagem de Bastão
app.post('/api/notes', (req: Request, res: Response) => {
  const { content, mood, author_name, author_role } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Conteúdo da nota é obrigatório" });
  }

  const now = new Date();
  const timeStr = `Hoje às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newNote = {
    id: `dn-${Date.now()}`,
    author_name: author_name || "Juliana Schaun",
    author_role: author_role || "Filha (Coordenadora)",
    content,
    created_at: timeStr,
    mood: mood || "tranquila",
  };

  dailyNotes.unshift(newNote);
  res.json({ success: true, note: newNote });
});

// Escala / Shifts
app.get('/api/schedule', (req: Request, res: Response) => {
  res.json({
    shifts,
    members: circleMembers,
  });
});

app.post('/api/schedule', (req: Request, res: Response) => {
  const { date, caregiver_id, caregiver_name, period, status, notes } = req.body;
  const newShift = {
    id: `s-${Date.now()}`,
    date,
    caregiver_id,
    caregiver_name,
    period: period || "integral",
    status: status || "confirmado",
    notes,
  };
  shifts.push(newShift);
  res.json({ success: true, shift: newShift });
});

app.post('/api/schedule/:id/swap', (req: Request, res: Response) => {
  const { id } = req.params;
  const { substitute_name, notes } = req.body;
  const shift = shifts.find(s => s.id === id);
  if (!shift) return res.status(404).json({ error: "Plantão não encontrado" });

  shift.status = "troca_solicitada";
  shift.substitute_name = substitute_name;
  if (notes) shift.notes = notes;

  res.json({ success: true, shift });
});

// Health / Medications & Appointments
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    elder: elderProfile,
    medications,
    appointments: medicalAppointments,
    vitals: vitalMeasurements,
  });
});

app.post('/api/medications', (req: Request, res: Response) => {
  const { name, dosage, schedule_times, stock_days_left, instructions, prescription_holder } = req.body;
  const newMed = {
    id: `med-${Date.now()}`,
    name,
    dosage,
    schedule_times: Array.isArray(schedule_times) ? schedule_times : [schedule_times],
    stock_days_left: Number(stock_days_left) || 30,
    instructions: instructions || "",
    prescription_holder: prescription_holder || "Família",
  };
  medications.push(newMed);
  res.json({ success: true, medication: newMed });
});

app.post('/api/vitals', (req: Request, res: Response) => {
  const { type, value, measured_by } = req.body;
  const now = new Date();
  const newVital = {
    id: `vm-${Date.now()}`,
    type,
    value,
    date: "Hoje",
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    measured_by: measured_by || "Juliana (Filha)",
  };
  vitalMeasurements.unshift(newVital);
  res.json({ success: true, vital: newVital });
});

app.post('/api/appointments', (req: Request, res: Response) => {
  const { specialty, doctor, date, time, location, companion, notes } = req.body;
  const newApp = {
    id: `app-${Date.now()}`,
    specialty,
    doctor,
    date,
    time,
    location,
    companion: companion || "Família",
    notes,
  };
  medicalAppointments.push(newApp);
  res.json({ success: true, appointment: newApp });
});

// Custos / Shared Expenses
app.get('/api/costs', (req: Request, res: Response) => {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate balances per family sibling
  const siblings = circleMembers.filter(m => m.role === "coordenador" || m.role === "familiar");
  const siblingCount = siblings.length || 3;
  const fairShare = totalAmount / siblingCount;

  const balances = siblings.map(s => {
    const paidByMember = expenses
      .filter(e => e.paid_by_name.toLowerCase().includes(s.name.split(' ')[0].toLowerCase()))
      .reduce((sum, e) => sum + e.amount, 0);
    const netBalance = paidByMember - fairShare;

    return {
      member_name: s.name,
      total_paid: paidByMember,
      fair_share: fairShare,
      net_balance: netBalance, // positive = to receive, negative = to pay
      pix_key: s.pix_key || "Não cadastrado",
    };
  });

  res.json({
    expenses,
    total_amount: totalAmount,
    balances,
  });
});

app.post('/api/costs', (req: Request, res: Response) => {
  const { title, category, amount, paid_by_name, date, split_between } = req.body;
  if (!title || !amount || !paid_by_name) {
    return res.status(400).json({ error: "Dados incompletos para registrar o custo" });
  }

  const newExpense = {
    id: `exp-${Date.now()}`,
    title,
    category: category || "outros",
    amount: parseFloat(amount),
    paid_by_name,
    paid_by_id: "m-custom",
    date: date || new Date().toLocaleDateString('pt-BR'),
    split_between: split_between || ["Juliana Schaun", "Rodrigo Schaun", "Mariana Schaun"],
  };

  expenses.unshift(newExpense);
  res.json({ success: true, expense: newExpense });
});

// Círculo de Cuidado
app.get('/api/circle', (req: Request, res: Response) => {
  res.json({
    members: circleMembers,
    elder: elderProfile,
    invite_code: "AMPARAI-SCHAUN-2026",
  });
});

app.post('/api/circle/invite', (req: Request, res: Response) => {
  const { name, relation, role, phone, email, is_emergency_contact, pix_key } = req.body;
  const newMember = {
    id: `m-${Date.now()}`,
    name,
    relation,
    role: role || "familiar",
    phone,
    email,
    is_emergency_contact: Boolean(is_emergency_contact),
    pix_key,
  };
  circleMembers.push(newMember);
  res.json({ success: true, member: newMember });
});

// SOS / Emergency Trigger
app.get('/api/sos', (req: Request, res: Response) => {
  res.json({
    elder: elderProfile,
    emergency_contacts: circleMembers.filter(m => m.is_emergency_contact),
    public_services: [
      { name: "SAMU (Ambulância de Emergência)", number: "192", type: "medico" },
      { name: "Bombeiros (Resgate / Socorro)", number: "193", type: "resgate" },
      { name: "Polícia Militar", number: "190", type: "seguranca" },
    ],
    doctor: {
      name: elderProfile.doctor_name,
      phone: elderProfile.doctor_phone,
    },
    recent_events: sosEvents,
  });
});

app.post('/api/sos/trigger', (req: Request, res: Response) => {
  const { triggered_by, location_note, notes } = req.body;
  const event = {
    id: `sos-${Date.now()}`,
    timestamp: new Date().toISOString(),
    formatted_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    triggered_by: triggered_by || "Juliana Schaun",
    elder_name: elderProfile.name,
    location: location_note || elderProfile.address,
    status: "acionado",
    notes: notes || "Acionamento de emergência pelo aplicativo da família.",
  };
  sosEvents.unshift(event);
  res.json({
    success: true,
    message: "Círculo de cuidado acionado com sucesso!",
    event,
  });
});

// AI Gentle Summary (Gemini 3.7 Flash with nursing-tone guidelines)
app.post('/api/ai/daily-summary', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        summary: `Hoje o dia com ${elderProfile.nickname || elderProfile.name} correu de forma acolhedora. Os cuidados da manhã foram realizados com carinho, o almoço foi nutritivo com boa hidratação e a caminhada no jardim trouxe bastante disposição. A família está bem sincronizada!`,
        source: "fallback",
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const completedTasks = routineItems.filter(i => i.completed).map(i => `${i.title} (${i.completed_by || 'feito'})`).join(', ');
    const pendingTasks = routineItems.filter(i => !i.completed).map(i => `${i.title} às ${i.time}`).join(', ');
    const notesText = dailyNotes.map(n => `${n.author_name}: "${n.content}"`).join('\n');

    const prompt = `Você é uma enfermeira carinhosa e melhor amiga da família que ajuda a cuidar de ${elderProfile.name} (${elderProfile.nickname}).
Escreva um resumo diário gentil, acolhedor e claro para os filhos e cuidadores saberem como foi o dia hoje.
Destaque o que correu bem com leveza e empatia.

DADOS DO DIA:
- Cuidados feitos: ${completedTasks || 'Em andamento'}
- Próximos horários: ${pendingTasks || 'Tudo em dia'}
- Notícias da família:
${notesText}

REGRAS INVIOLÁVEIS:
1. Nunca use as palavras: "o idoso", "paciente", "monitorar", "rastrear", "vigiar", "controlar", "ALERTA" ou nomes de doenças/diagnósticos.
2. Fale sempre de "${elderProfile.nickname || elderProfile.name}" com amor e respeito.
3. Mantenha em 2 a 3 parágrafos curtos, calorosos e sem jargões.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    const summary = response.text || `Tudo correndo bem com ${elderProfile.nickname || elderProfile.name} hoje. A rotina está organizada e os cuidados foram cumpridos com carinho.`;

    res.json({
      summary,
      source: "gemini",
    });
  } catch (error) {
    console.error("AI Summary error:", error);
    res.json({
      summary: `O dia com ${elderProfile.nickname || elderProfile.name} está calmo e organizado. As atividades da manhã foram concluídas e o círculo familiar está acompanhando cada detalhe com amor e carinho.`,
      source: "fallback",
    });
  }
});

// Setup Vite development middleware or static file serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amparai server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
