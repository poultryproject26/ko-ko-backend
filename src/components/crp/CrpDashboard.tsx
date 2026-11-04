import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { User, clearUser } from "@/lib/auth";
import {
  LayoutDashboard, Users, Bell, FileText, LogOut, ClipboardList, ShoppingBag, Syringe, UserCircle,
} from "lucide-react";
import CrpDashboardTab from "./CrpDashboardTab";
import CrpFarmersTab from "./CrpFarmersTab";
import CrpAlertsTab from "./CrpAlertsTab";
import CrpReportsTab from "./CrpReportsTab";
import CrpApproveFarmersTab from "./CrpApproveFarmersTab";
import CrpServicesTab from "./CrpServicesTab";
import CrpStockTab from "./CrpStockTab";
import CrpVaccinationScheduleTab from "./CrpVaccinationScheduleTab";
import ChangePinCard from "@/components/ui/ChangePinCard";

interface CrpDashboardProps {
  user: User;
  onLogout: () => void;
}

type CrpTab = "dashboard" | "farmers" | "alerts" | "services" | "approve" | "reports" | "stock" | "vaxschedule" | "profile";

const CrpDashboard = ({ user, onLogout }: CrpDashboardProps) => {
  const { t, lang, setLang } = useLanguage();
  const [tab, setTab] = useState<CrpTab>("dashboard");

  const handleLogout = () => {
    clearUser();
    onLogout();
  };

  const tabs: { key: CrpTab; icon: typeof LayoutDashboard; label: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { key: "farmers",   icon: Users,           label: t("farmers") },
    { key: "services",  icon: ClipboardList,   label: t("services") },
    { key: "stock",     icon: ShoppingBag,  label: t("stock") },
    { key: "vaxschedule", icon: Syringe,    label: t("birdBatches") },
    { key: "alerts",    icon: Bell,         label: t("alerts") },
    { key: "reports",   icon: FileText,     label: t("reports") },
    { key: "profile",   icon: UserCircle,   label: t("profile") },
  ];

  const handleNavigate = (target: "reports" | "alerts" | "services" | "approve") => {
    setTab(target as CrpTab);
  };

  const renderContent = () => {
    switch (tab) {
      case "dashboard": return <CrpDashboardTab onNavigate={handleNavigate} />;
      case "farmers":   return <CrpFarmersTab />;
      case "alerts":    return <CrpAlertsTab user={user} />;
      case "services":  return <CrpServicesTab user={user} />;
      case "stock":       return <CrpStockTab />;
      case "approve":     return <CrpApproveFarmersTab />;
      case "vaxschedule": return <CrpVaccinationScheduleTab />;
      case "reports":     return <CrpReportsTab />;
      case "profile":     return (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="px-4 py-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #2E7D32, #388E3C)" }}>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-bold text-white">{user.name}</p>
                <p className="text-xs text-white/75">{user.phone}</p>
                <p className="text-xs text-white/60">CRP</p>
              </div>
            </div>
          </div>
          <ChangePinCard />
        </div>
      );
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-card shadow-lg flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #2E7D32, #388E3C)" }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg bg-white/10" />
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{t("appNameTamil")}</h1>
            <p className="text-xs text-white/75">CRP - {user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            className="text-xs font-bold border border-white/30 rounded-lg px-2.5 py-1 text-white/80 hover:text-white hover:border-white/60 bg-white/10"
          >
            {lang === "ta" ? "EN" : "தமிழ்"}
          </button>
          <button onClick={handleLogout} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="max-w-[430px] mx-auto flex">
          {tabs.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center py-3 ${
                tab === key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={22} />
              {tab === key && <div className="w-4 h-0.5 bg-primary rounded-full mt-1" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CrpDashboard;
