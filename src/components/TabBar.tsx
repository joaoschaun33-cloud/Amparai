import React from "react";
import { Sun, Heart, Calendar, DollarSign } from "lucide-react";

export type TabType = "hoje" | "saude" | "escala" | "custos";

interface TabBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: "hoje" as TabType, label: "Hoje", icon: Sun },
    { id: "saude" as TabType, label: "Saúde", icon: Heart },
    { id: "escala" as TabType, label: "Escala", icon: Calendar },
    { id: "custos" as TabType, label: "Custos", icon: DollarSign },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-t border-[#E6DEC6] py-2 px-4 shadow-lg">
      <nav aria-label="Navegação Principal" className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
                isActive
                  ? "text-[#2E7D60] font-bold"
                  : "text-[#786E65] font-medium hover:text-[#4A423B]"
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-all ${
                  isActive ? "bg-[#E8F4F0]" : "bg-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
