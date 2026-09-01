import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SOSModal } from './components/SOSModal';
import { AddCareModal } from './components/AddCareModal';
import { HojeScreen } from './screens/HojeScreen';
import { EscalaScreen } from './screens/EscalaScreen';
import { SaudeScreen } from './screens/SaudeScreen';
import { CustosScreen } from './screens/CustosScreen';
import { CirculoScreen } from './screens/CirculoScreen';
import { ClinicoScreen } from './screens/ClinicoScreen';
import { ContaScreen } from './screens/ContaScreen';
import { ConsentimentoScreen } from './screens/ConsentimentoScreen';

function MainApp() {
  const { activeTab } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F0E6] flex flex-col text-[#3E2F25]">
      {/* App Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5">
        {activeTab === 'hoje' && <HojeScreen />}
        {activeTab === 'escala' && <EscalaScreen />}
        {activeTab === 'saude' && <SaudeScreen />}
        {activeTab === 'custos' && <CustosScreen />}
        {activeTab === 'circulo' && <CirculoScreen />}
        {activeTab === 'clinico' && <ClinicoScreen />}
        {activeTab === 'conta' && <ContaScreen />}
        {activeTab === 'consentimento' && <ConsentimentoScreen />}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav />

      {/* Modals */}
      <SOSModal />
      <AddCareModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

