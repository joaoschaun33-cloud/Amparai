import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, ElderProfile } from "../types";

export type TabType = 'hoje' | 'escala' | 'saude' | 'custos' | 'circulo' | 'clinico' | 'conta' | 'consentimento' | 'medico';

export interface AuthContextType {
  user: User | null;
  elder: ElderProfile | null;
  loading: boolean;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isSosOpen: boolean;
  setIsSosOpen: (open: boolean) => void;
  isAddCareOpen: boolean;
  setIsAddCareOpen: (open: boolean) => void;
  addCareType: 'rotina' | 'remedio' | 'nota' | 'custo' | 'plantao';
  openAddCare: (type?: 'rotina' | 'remedio' | 'nota' | 'custo' | 'plantao') => void;
  refreshData: () => Promise<void>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    user_id: "juliana-schaun",
    name: "Juliana Schaun",
    email: "juliana.schaun@amparai.com.br",
    role: "coordenador",
    phone: "(21) 99881-2233",
    pix_key: "juliana@email.com",
  });

  const [elder, setElder] = useState<ElderProfile | null>({
    id: "helena-schaun",
    name: "Helena Schaun",
    nickname: "Dona Helena",
    age: 78,
    blood_type: "O+",
    allergies: ["Dipirona"],
    vital_conditions: ["Atenção leve à pressão"],
    address: "Rua das Laranjeiras, 420, Apto 502, Rio de Janeiro - RJ",
    health_insurance: "Bradesco Saúde Top",
    health_insurance_number: "982.341.002.88",
    doctor_name: "Dra. Cecília Mendes (Geriatra)",
    doctor_phone: "(21) 98844-3321",
    created_at: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('hoje');
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isAddCareOpen, setIsAddCareOpen] = useState(false);
  const [addCareType, setAddCareType] = useState<'rotina' | 'remedio' | 'nota' | 'custo' | 'plantao'>('rotina');

  const openAddCare = (type: 'rotina' | 'remedio' | 'nota' | 'custo' | 'plantao' = 'rotina') => {
    setAddCareType(type);
    setIsAddCareOpen(true);
  };

  const authFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    if (user?.user_id && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${user.user_id}`);
    }
    if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }
    return fetch(url, { ...init, headers });
  }, [user]);

  const refreshData = useCallback(async () => {
    try {
      const resElder = await fetch("/api/elder");
      if (resElder.ok) {
        const d = await resElder.json();
        if (d && d.name) setElder(d);
      }
    } catch (e) {
      console.warn("Refresh data error:", e);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        elder,
        loading,
        activeTab,
        setActiveTab,
        isSosOpen,
        setIsSosOpen,
        isAddCareOpen,
        setIsAddCareOpen,
        addCareType,
        openAddCare,
        refreshData,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
