export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  role?: "coordenador" | "familiar" | "cuidador" | string;
  phone?: string;
  pix_key?: string;
}

export interface Elder {
  id: string;
  name: string;
  nickname?: string;
  age?: number;
  photo_url?: string;
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

export interface RoutineItem {
  id: string;
  title: string;
  period: "manha" | "tarde" | "noite";
  time: string;
  category: "medicamento" | "alimentacao" | "bem_estar" | "atividade";
  description?: string;
  dosage?: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export interface DailyNote {
  id: string;
  author_name: string;
  author_role?: string;
  author_avatar?: string;
  content?: string;
  detail?: string;
  created_at?: string;
  date?: string;
  time?: string;
  mood?: "bem" | "tranquila" | "cansada" | "animada" | string;
}

export interface Shift {
  id: string;
  day_label?: string;
  slot?: string;
  caregiver_name: string;
  caregiver_avatar?: string;
  role?: string;
  covered?: boolean;
  date?: string;
  caregiver_id?: string;
  period?: "integral" | "manha" | "tarde" | "noite" | string;
  status?: "confirmado" | "folga" | "troca_solicitada" | string;
  notes?: string;
  substitute_name?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time?: string;
  taken?: boolean;
  period?: string;
  schedule_times?: string[];
  stock_days_left?: number;
  instructions?: string;
  prescription_holder?: string;
}

export interface Appointment {
  id: string;
  title?: string;
  specialty?: string;
  doctor?: string;
  date?: string;
  time?: string;
  when?: string;
  location?: string;
  notes?: string;
  companion?: string;
}

export type MedicalAppointment = Appointment;

export interface VitalMeasurement {
  id: string;
  type?: "pressao" | "glicemia" | "saturacao" | "temperatura" | string;
  kind?: string;
  value?: string;
  date?: string;
  time?: string;
  when?: string;
  title?: string;
  detail?: string;
  author_name?: string;
  measured_by?: string;
}

export type HealthEvent = VitalMeasurement;

export interface Expense {
  id: string;
  title: string;
  category: "farmacia" | "cuidador" | "consulta" | "compras" | "outros" | string;
  amount: number;
  paid_by?: string;
  paid_by_name?: string;
  paid_by_id?: string;
  date: string;
  receipt_url?: string;
  receipt_thumb?: string;
  split_between?: string[];
  split_status?: Record<string, "pago" | "pendente" | string>;
}

export interface Member {
  id: string;
  name: string;
  relation?: string;
  role?: "coordenador" | "familiar" | "cuidador" | string;
  avatar?: string;
  phone?: string;
  email?: string;
  is_emergency_contact?: boolean;
  pix_key?: string;
  can_see_financeiro?: boolean;
  can_see_notas?: boolean;
}

export type CircleMember = Member;

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

export interface ConsentStatus {
  consented: boolean;
  accepted_at?: string;
  term_version?: string;
  method?: string;
}
