import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification, NotificationPreferences } from '../types';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  Pill, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  Settings, 
  Volume2, 
  Smartphone, 
  X,
  Sparkles
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadChange,
}) => {
  const { setActiveTab } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testSent, setTestSent] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
        if (onUnreadChange) onUnreadChange(data.unread_count || 0);
        setPreferences(data.preferences);
      }
    } catch (e) {
      console.error("Erro ao buscar notificações:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, actionUrl?: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (onUnreadChange) onUnreadChange(Math.max(0, unreadCount - 1));

      if (actionUrl) {
        if (actionUrl.includes('hoje')) setActiveTab('hoje');
        else if (actionUrl.includes('saude')) setActiveTab('saude');
        else if (actionUrl.includes('escala')) setActiveTab('escala');
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      if (onUnreadChange) onUnreadChange(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTestPush = async () => {
    try {
      const res = await fetch('/api/notifications/test-push', { method: 'POST' });
      if (res.ok) {
        setTestSent(true);
        await fetchNotifications();
        setTimeout(() => setTestSent(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'remedio':
        return <div className="w-8 h-8 rounded-lg bg-[#FFF9F0] text-[#C4633F] flex items-center justify-center shrink-0"><Pill className="w-4 h-4" /></div>;
      case 'recado':
        return <div className="w-8 h-8 rounded-lg bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center shrink-0"><MessageSquare className="w-4 h-4" /></div>;
      case 'plantao':
        return <div className="w-8 h-8 rounded-lg bg-[#F0EBF5] text-[#6E4975] flex items-center justify-center shrink-0"><Calendar className="w-4 h-4" /></div>;
      default:
        return <div className="w-8 h-8 rounded-lg bg-[#F7F0E6] text-[#6B5A4C] flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-[#FFFDF9] w-full max-w-md h-full flex flex-col border-l border-[#EAE0D3] shadow-2xl animate-slide-left">
        
        {/* Header */}
        <div className="p-4 border-b border-[#EAE0D3] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF0E6] text-[#5C6E49] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#3E2F25]">
                Avisos do Círculo
              </h3>
              <p className="text-[11px] text-[#6B5A4C]">
                {unreadCount > 0 ? `${unreadCount} novos avisos com a mãe` : "Tudo em dia e sereno"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-[#5C6E49] text-white' : 'text-[#6B5A4C] hover:bg-[#F7F0E6]'}`}
              title="Preferências de Notificação"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#6B5A4C] hover:bg-[#F7F0E6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content View: Config vs Notification List */}
        {showConfig ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="space-y-1">
              <h4 className="font-display font-bold text-sm text-[#3E2F25]">Preferências de Avisos (Onda 2)</h4>
              <p className="text-xs text-[#6B5A4C]">Escolha como deseja ser avisado sobre os cuidados da Dona Helena.</p>
            </div>

            {preferences && (
              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-[#EAE0D3] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#3E2F25] block">Remédios tomados</span>
                    <span className="text-[11px] text-[#6B5A4C]">Avisar quando a cuidadora confirmar medicamento</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.medication_alerts}
                    onChange={() => handleTogglePreference('medication_alerts')}
                    className="w-4 h-4 accent-[#5C6E49] rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#EAE0D3] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#3E2F25] block">Novos recados no diário</span>
                    <span className="text-[11px] text-[#6B5A4C]">Fotos e anotações do dia com a mãe</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.daily_notes_alerts}
                    onChange={() => handleTogglePreference('daily_notes_alerts')}
                    className="w-4 h-4 accent-[#5C6E49] rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#EAE0D3] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#3E2F25] block">Lembretes de plantão na escala</span>
                    <span className="text-[11px] text-[#6B5A4C]">Aviso suave 24h antes da sua vez de cuidar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.shift_reminders}
                    onChange={() => handleTogglePreference('shift_reminders')}
                    className="w-4 h-4 accent-[#5C6E49] rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#EAE0D3] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#3E2F25] block">Web Push no Celular / PWA</span>
                    <span className="text-[11px] text-[#6B5A4C]">Receber notificações mesmo com app fechado</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.push_enabled}
                    onChange={() => handleTogglePreference('push_enabled')}
                    className="w-4 h-4 accent-[#5C6E49] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Test Push Button */}
            <div className="pt-2 border-t border-[#EAE0D3] space-y-2">
              <button
                type="button"
                onClick={handleSendTestPush}
                className="w-full py-2.5 px-4 bg-[#EBF0E6] hover:bg-[#8A9E74]/30 text-[#465538] border border-[#8A9E74]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4 text-[#5C6E49]" />
                {testSent ? "Notificação enviada!" : "Testar Notificação no Dispositivo"}
              </button>
              <span className="text-[10px] text-[#A89B8F] text-center block">
                Respeitamos o silêncio da sua família: sem alertas sonoros estridentes.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="px-4 py-2 bg-[#F7F0E6]/50 border-b border-[#EAE0D3] flex items-center justify-between text-xs">
              <span className="text-[#6B5A4C] font-semibold">Histórico de Hoje</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[#5C6E49] font-bold hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {loading ? (
                <div className="py-12 text-center text-xs text-[#6B5A4C]">Carregando avisos...</div>
              ) : notifications.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-[#5C6E49] mx-auto opacity-40" />
                  <p className="text-xs font-semibold text-[#3E2F25]">Nenhum aviso pendente</p>
                  <p className="text-[11px] text-[#6B5A4C]">Você será notificado assim que novos cuidados forem registrados.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.action_url)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      !n.read 
                        ? 'bg-white border-[#5C6E49]/40 shadow-xs hover:border-[#5C6E49]' 
                        : 'bg-[#F7F0E6]/30 border-[#EAE0D3] opacity-75 hover:opacity-100'
                    }`}
                  >
                    {getNotifIcon(n.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="font-bold text-xs text-[#3E2F25]">{n.title}</h5>
                        <span className="text-[10px] text-[#A89B8F] shrink-0">{n.timestamp}</span>
                      </div>
                      <p className="text-xs text-[#6B5A4C] leading-snug">{n.message}</p>
                      {n.sender_name && (
                        <span className="text-[10px] text-[#5C6E49] font-semibold block">
                          Por: {n.sender_name}
                        </span>
                      )}
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#5C6E49] mt-1.5 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-[#EAE0D3] bg-white text-center">
          <p className="text-[11px] text-[#6B5A4C]">
            Amparai • Cuidado compartilhado e sereno para a família
          </p>
        </div>

      </div>
    </div>
  );
};
