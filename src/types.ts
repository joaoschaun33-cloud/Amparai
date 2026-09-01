export interface User {
  user_id: string;
  email: string;
  name: string;
  role?: string;
  picture?: string | null;
  phone?: string;
  pix_key?: string;
}

export interface Elder {
  id: string;
  name: string;
  age: number;
  photo_url?: string;
  nickname?: string;
  birth_date?: string;
  blood_type?: string;
  allergies?: string[];
  vital_conditions?: string[];
  address?: string;
  cep?: string;
  health_insurance?: string;
  health_insurance_number?: string;
  doctor_name?: string;
  doctor_phone?: string;
  created_at?: string;
}

export type ElderProfile = Elder;

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time?: string;
  taken?: boolean;
  period?: string;
  stock_days_left?: number;
  instructions?: string;
  prescription_holder?: string;
  schedule_times?: string[];
}

export interface Shift {
  id: string;
  day_label?: string;
  slot?: string;
  caregiver_name: string;
  caregiver_avatar?: string;
  role?: string;
  covered?: boolean;
  date: string;
  period?: string;
  status?: 'confirmado' | 'folga' | 'troca_solicitada' | string;
  notes?: string;
  substitute_name?: string;
}

export interface Appointment {
  id: string;
  title?: string;
  when?: string;
  doctor?: string;
  location?: string;
  date: string;
  time?: string;
  notes?: string;
  specialty?: string;
  companion?: string;
}

export type MedicalAppointment = Appointment;

export interface HealthEvent {
  id: string;
  kind?: "pressao" | "audio" | "observacao" | "consulta" | string;
  type?: "pressao" | "glicemia" | "saturacao" | string;
  title?: string;
  detail?: string;
  content?: string;
  when?: string;
  author_name?: string;
  author_avatar?: string;
  author_role?: string;
  value?: string;
  date?: string;
  time?: string;
  measured_by?: string;
  mood?: string;
  created_at?: string;
}

export type VitalMeasurement = HealthEvent;
export type DailyNote = HealthEvent;

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  paid_by?: string;
  paid_by_name?: string;
  split_status?: Record<string, "pago" | "pendente">;
  receipt_thumb?: string;
  receipt_url?: string;
  split_between?: string[];
}

export interface Member {
  id: string;
  name: string;
  role: 'coordenador' | 'familiar' | 'cuidador' | string;
  avatar?: string;
  can_see_financeiro?: boolean;
  can_see_notas?: boolean;
  phone?: string;
  email?: string;
  relation?: string;
  is_emergency_contact?: boolean;
  pix_key?: string;
}

export type CircleMember = Member;

export interface RoutineItem {
  id: string;
  title: string;
  period: "manha" | "tarde" | "noite";
  time: string;
  category?: "medicamento" | "alimentacao" | "bem_estar" | "atividade" | string;
  description?: string;
  dosage?: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export interface ClinicalData {
  blood_type?: string;
  allergies?: string[];
  conditions?: string[];
  health_plan?: {
    name: string;
    plan: string;
    card_number: string;
  };
  notes?: string;
  mobility?: string;
  cognitive?: string;
}

export interface LocationSettings {
  home_address?: string;
  latitude?: number;
  longitude?: number;
  radius_m?: number;
}

export interface MedBagDocument {
  id: string;
  title: string;
  category: 'receita' | 'exame' | 'laudo' | 'vacina' | 'outro';
  date: string;
  doctor_name?: string;
  specialty?: string;
  file_url?: string;
  file_type?: 'pdf' | 'image';
  summary?: string;
  tags?: string[];
  created_at: string;
  uploaded_by: string;
}

export interface ShareableHealthLink {
  token: string;
  url: string;
  expires_at: string;
  elder_name: string;
  authorized_by: string;
}

export interface WeeklyCareSummary {
  week_label: string;
  adherence_rate: number;
  completed_cares_count: number;
  total_cares_count: number;
  vital_stability: string;
  highlights: string[];
  tone_summary: string;
  shift_recap: { caregiver_name: string; shifts_count: number }[];
  source_provider: 'gemini' | 'grok' | 'groq' | 'fallback';
  generated_at: string;
  cost_brl: number;
}

export interface AICallAudit {
  id: string;
  timestamp: string;
  endpoint: string;
  provider: string;
  latency_ms: number;
  tokens_prompt: number;
  tokens_completion: number;
  cost_brl: number;
  success: boolean;
}

export interface AppNotification {
  id: string;
  type: 'remedio' | 'recado' | 'plantao' | 'saude' | 'sistema';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
  sender_name?: string;
}

export interface NotificationPreferences {
  medication_alerts: boolean;
  daily_notes_alerts: boolean;
  shift_reminders: boolean;
  weekly_summary_alert: boolean;
  sound_enabled: boolean;
  push_enabled: boolean;
}

export interface FamilyFeedback {
  id: string;
  family_member_name: string;
  peace_of_mind_rating: number; // 1 to 5
  daily_routine_easy_rating: number; // 1 to 5
  message: string;
  highlight?: string;
  created_at: string;
}

export type PlanType = 'gratuito' | 'circulo_familiar';

export interface SubscriptionInfo {
  current_plan: PlanType;
  plan_name: string;
  price_brl_monthly: number;
  members_count: number;
  medbag_storage_used_mb: number;
  medbag_storage_limit_mb: number;
  ai_summaries_enabled: boolean;
  status: 'active' | 'trial' | 'free';
  next_billing_date?: string;
}

