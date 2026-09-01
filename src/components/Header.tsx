import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Bell, Heart, Sparkles } from 'lucide-react';
import { NotificationsDrawer } from './NotificationsDrawer';
import { FeedbackModal } from './FeedbackModal';
import { PilotOnboardingModal } from './PilotOnboardingModal';

export const Header: React.FC = () => {
  const { elder, user, activeTab, setActiveTab } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count || 0);
        }
      } catch (e) {
        // silent fail
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#EAE0D3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand & Elder Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('hoje')}>
            <div className="w-8 h-8 rounded-xl bg-[#5C6E49] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs">
              A
            </div>
            <span className="font-display font-bold text-lg text-[#3E2F25] tracking-tight">
              Amparai
            </span>
          </div>

          <div className="h-4 w-px bg-[#EAE0D3] hidden sm:block" />

          <button
            onClick={() => setActiveTab('clinico')}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EBF0E6] hover:bg-[#8A9E74]/30 border border-[#8A9E74]/30 text-xs text-[#3E2F25] transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-[#5C6E49] animate-pulse" />
            <span className="font-semibold text-[#465538]">
              {elder?.nickname || elder?.name || "Dona Helena"}
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Pilot Info Badge */}
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#FFF9F0] text-[#C4633F] border border-[#C4633F]/30 hover:bg-[#C4633F]/10 transition-colors"
            title="Sobre o Piloto Fechado"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Piloto
          </button>

          {/* Feedback Button */}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="p-2 rounded-xl text-xs font-semibold text-[#6B5A4C] hover:bg-[#F7F0E6] transition-all flex items-center gap-1"
            title="Enviar Feedback ao Diretor de Produto"
          >
            <Heart className="w-4 h-4 text-[#C4633F]" />
            <span className="hidden md:inline text-[11px]">Feedback</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-xl text-xs font-semibold text-[#6B5A4C] hover:bg-[#F7F0E6] transition-all"
            title="Avisos do Círculo"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#C4633F] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('circulo')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'circulo'
                ? 'bg-[#5C6E49] text-white'
                : 'text-[#6B5A4C] hover:bg-[#F7F0E6]'
            }`}
            title="Círculo de Cuidado"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Círculo</span>
          </button>

          <button
            onClick={() => setActiveTab('conta')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'conta'
                ? 'bg-[#5C6E49] text-white'
                : 'text-[#6B5A4C] hover:bg-[#F7F0E6]'
            }`}
            title="Minha Conta"
          >
            <div className="w-5 h-5 rounded-full bg-[#EAE0D3] text-[#3E2F25] text-[10px] font-bold flex items-center justify-center">
              {user?.name.slice(0, 1) || 'U'}
            </div>
            <span className="hidden sm:inline font-medium">{user?.name.split(' ')[0]}</span>
          </button>
        </div>

      </div>

      {/* Drawers & Modals */}
      <NotificationsDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onUnreadChange={(count) => setUnreadCount(count)}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      <PilotOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </header>
  );
};

