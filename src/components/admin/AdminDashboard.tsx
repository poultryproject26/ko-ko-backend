import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { User } from "@/lib/auth";
import { Hamlet } from "@/lib/api";
import {
  LogOut, LayoutDashboard, FileBarChart, Megaphone, MapPinned, Signpost, UserCog, Users, UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminOverview from "./AdminOverview";
import AdminReports from "./AdminReports";
import AdminAnnouncements from "./AdminAnnouncements";
import HamletManagement from "./HamletManagement";
import StreetManagement from "./StreetManagement";
import CrpManagement from "./CrpManagement";
import FarmerManagement from "./FarmerManagement";
import ChangePinCard from "@/components/ui/ChangePinCard";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

type AdminSection = "overview" | "reports" | "announcements" | "hamlets" | "streets" | "crps" | "farmers" | "profile";

const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const { t, lang, setLang } = useLanguage();
  const [section, setSection] = useState<AdminSection>("overview");
  const [streetsHamletId, setStreetsHamletId] = useState<string | null>(null);

  const handleViewStreets = (hamlet: Hamlet) => {
    setStreetsHamletId(hamlet._id);
    setSection("streets");
  };

  const sections: { key: AdminSection; label: string; icon: LucideIcon }[] = [
    { key: "overview", label: t("adminOverview"), icon: LayoutDashboard },
    { key: "reports", label: t("adminReports"), icon: FileBarChart },
    { key: "announcements", label: t("adminAnnouncements"), icon: Megaphone },
    { key: "hamlets", label: t("adminHamletManagement"), icon: MapPinned },
    { key: "streets", label: t("adminStreetManagement"), icon: Signpost },
    { key: "crps", label: t("adminCrpManagement"), icon: UserCog },
    { key: "farmers", label: t("adminFarmerManagement"), icon: Users },
    { key: "profile", label: t("profile"), icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 h-16 agri-header-gradient shadow-md">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight truncate">{t("appNameTamil")}</h1>
              <p className="text-xs text-white/75 truncate">{t("adminRoleLabel")} — {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="text-xs font-bold border border-white/30 rounded-lg px-2.5 py-1.5 text-white/80 hover:text-white hover:border-white/60 bg-white/10"
            >
              {lang === "ta" ? "EN" : "தமிழ்"}
            </button>
            {/* Called with no args: passing the click event through would reach
                Index.handleLogout as its `reason` and be handed to toast(). */}
            <button
              onClick={() => onLogout()}
              className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20"
            >
              <LogOut size={16} />
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / tablet: horizontally scrollable section tabs */}
      <nav className="lg:hidden sticky top-16 z-10 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="flex gap-2 px-4 sm:px-6 py-2.5 overflow-x-auto">
          {sections.map((s) => {
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <s.icon size={15} />
                {s.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex">
        {/* Desktop: sidebar navigation */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] bg-card border-r border-border">
          <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
            {sections.map((s) => {
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <s.icon size={18} className="shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
                {(user.name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">{t("adminRoleLabel")}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            {section === "overview" && <AdminOverview />}
            {section === "reports" && <AdminReports />}
            {section === "announcements" && <AdminAnnouncements />}
            {section === "hamlets" && <HamletManagement onViewStreets={handleViewStreets} />}
            {section === "streets" && <StreetManagement initialHamletId={streetsHamletId} />}
            {section === "crps" && <CrpManagement />}
            {section === "farmers" && <FarmerManagement />}
            {section === "profile" && (
              <div className="max-w-sm flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                  <div className="px-4 py-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #2E7D32, #4CAF50)" }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
                      {(user.name || "A").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{user.name}</p>
                      <p className="text-xs text-white/75">{user.phone}</p>
                      <p className="text-xs text-white/60">{t("adminRoleLabel")}</p>
                    </div>
                  </div>
                </div>
                <ChangePinCard />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
