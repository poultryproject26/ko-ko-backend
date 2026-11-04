import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { User, clearUser } from "@/lib/auth";
import { Home, ClipboardList, Bell, LogOut, IndianRupee, UserCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import HomeTab from "./HomeTab";
import WeeklyUpdateTab from "./WeeklyUpdateTab";
import DiseaseReportTab from "./DiseaseReportTab";
import NotificationsTab from "./NotificationsTab";
import MarketPricesTab from "./MarketPricesTab";
import LoanRequestTab from "./LoanRequestTab";
import ServiceRequestTab from "./ServiceRequestTab";
import ProfileTab from "./ProfileTab";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type Tab = "home" | "weekly" | "disease" | "prices" | "notifications" | "loan" | "profile";

const Dashboard = ({ user: initialUser, onLogout }: DashboardProps) => {
  const { t, lang, setLang } = useLanguage();
  const [tab, setTab] = useState<Tab>("home");
  const [notifCount, setNotifCount] = useState(0);
  const [loanCount, setLoanCount] = useState(0);
  const [user, setCurrentUser] = useState<User>(initialUser);

  // Weekly reminder on Fridays + monthly vaccination reminder on 1st
  useEffect(() => {
    const day = new Date().getDay(); // 5 = Friday
    const date = new Date().getDate();
    if (day === 5) {
      api.checkWeekSubmitted().then((res) => {
        if (!res?.submitted) {
          setTimeout(() => toast("📋 இன்று வெள்ளிக்கிழமை — வாராந்திர இருப்பு பதிவு செய்யவும்!", { duration: 6000 }), 2000);
        }
      }).catch(() => {});
    }
    if (date === 1) {
      setTimeout(() => toast("💉 மாத தொடக்கம் — கோழிகளுக்கான தடுப்பூசி தேவை பதிவு செய்யவும்!", { duration: 6000 }), 3000);
    }
  }, []);

  useEffect(() => {
    api.getNotifications().then((n) => {
      const seen: string[] = JSON.parse(localStorage.getItem("seen_notifications") || "[]");
      const unseen = n.filter((x: any) => !seen.includes(x._id));
      setNotifCount(unseen.length);
    }).catch(() => {});
    api.getServiceDemands().then((d: any[]) => {
      const seen: string[] = JSON.parse(localStorage.getItem("seen_actioned_demands") || "[]");
      const actioned = d.filter((s) =>
        (s.status === "Completed" || s.status === "Rejected") && !seen.includes(s._id)
      );
      setLoanCount(actioned.length);
    }).catch(() => {});
  }, []);

  const handleTabChange = (key: Tab) => {
    setTab(key);
    if (key === "notifications") {
      setNotifCount(0);
      api.getNotifications().then((n) => {
        const ids = n.map((x: any) => x._id);
        localStorage.setItem("seen_notifications", JSON.stringify(ids));
      }).catch(() => {});
    }
    if (key === "loan") {
      setLoanCount(0);
      api.getServiceDemands().then((d: any[]) => {
        const actioned = d
          .filter((s) => s.status === "Completed" || s.status === "Rejected")
          .map((s) => s._id);
        localStorage.setItem("seen_actioned_demands", JSON.stringify(actioned));
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    clearUser();
    onLogout();
  };

  const tabs: { key: Tab; icon: typeof Home; label: string }[] = [
    { key: "home",          icon: Home,        label: t("home") },
    { key: "weekly",        icon: ClipboardList, label: lang === "ta" ? "கோழி இருப்பு" : "Bird Stock" },
    { key: "loan",          icon: IndianRupee,  label: t("servicesNeededTitle") },
    { key: "notifications", icon: Bell,         label: t("notifications") },
    { key: "profile",       icon: UserCircle,   label: lang === "ta" ? "சுயவிவரம்" : "Profile" },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "linear-gradient(180deg, #f1f8e9 0%, #fafff8 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #2E7D32, #388E3C)" }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{t("appNameTamil")}</h1>
            <p className="text-[10px] text-white/70">{t("appTagline")}</p>
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
        {tab === "home" && <HomeTab user={user} onNavigate={(t) => handleTabChange(t)} />}
        {tab === "weekly" && <WeeklyUpdateTab />}
        {tab === "disease" && <DiseaseReportTab user={user} />}
        {tab === "prices" && <MarketPricesTab />}
        {tab === "notifications" && <NotificationsTab user={user} />}
        {tab === "profile" && <ProfileTab user={user} onUserUpdate={setCurrentUser} />}
        {tab === "loan" && (
          <div className="flex flex-col gap-5">
            <ServiceRequestTab />
            <LoanRequestTab />
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-border/40" style={{ background: "rgba(232,245,233,0.96)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-[430px] mx-auto flex">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex-1 min-w-0 flex flex-col items-center py-2.5 gap-1 transition-all ${
                tab === key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <div className={`p-1.5 rounded-xl transition-all ${tab === key ? "bg-primary/10" : ""}`}>
                  <Icon size={20} strokeWidth={tab === key ? 2.5 : 1.8} />
                </div>
                {key === "notifications" && notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 animate-soft-pulse">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
                {key === "loan" && loanCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-warning text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {loanCount > 99 ? "99+" : loanCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-tight text-center break-words px-0.5 ${
                tab === key ? "text-primary" : "text-muted-foreground"
              }`}>{label}</span>
              {tab === key && <div className="w-5 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
