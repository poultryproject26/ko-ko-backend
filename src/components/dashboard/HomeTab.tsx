import { useLanguage } from "@/i18n/LanguageContext";
import { User } from "@/lib/auth";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList, Bug, Bird,
  IndianRupee, ChevronRight,
} from "lucide-react";

type NavTab = "weekly" | "disease" | "notifications" | "prices" | "loan";

interface HomeTabProps {
  user: User;
  onNavigate?: (tab: NavTab) => void;
}

const HomeTab = ({ user, onNavigate }: HomeTabProps) => {
  const { t } = useLanguage();

  const { data: weekData } = useQuery({ queryKey: ["checkWeek"], queryFn: () => api.checkWeekSubmitted(), staleTime: 60_000 });

  const weekDone = weekData?.submitted ?? false;

  const cards: { key: NavTab; titleTa: string; titleEn: string; icon: typeof Bird; color: string; bg: string }[] = [
    { key: "weekly",  titleTa: t("weeklyUpdate"),        titleEn: "(Bird Stock and Vaccination Requirements)", icon: Bird, color: "text-primary", bg: "bg-primary/10" },
    { key: "loan",    titleTa: t("servicesNeededTitle"), titleEn: "(Other Services)",      icon: ClipboardList, color: "text-[#8D6E63]", bg: "bg-[#8D6E63]/10" },
    { key: "disease", titleTa: t("reportDisease"),       titleEn: "(Report diseases)",     icon: Bug,           color: "text-danger",    bg: "bg-danger/10" },
    { key: "prices",  titleTa: t("marketPriceTitle"),    titleEn: "(Current Market Status)", icon: IndianRupee, color: "text-[#F9A825]", bg: "bg-[#F9A825]/10" },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* Greeting card */}
      <div className="rounded-2xl p-5 text-white shadow-md" style={{ background: "linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold leading-tight">{t("hello")}, {user.name} 👋</p>
            <p className="text-sm opacity-85 mt-0.5">{user.hamlet}{user.shgName ? ` • ${user.shgName}` : ""}</p>
          </div>
          <div className="text-3xl">🌾</div>
        </div>
        <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-base">{weekDone ? "✅" : "⏰"}</span>
          <p className="text-xs font-semibold">
            {weekDone ? t("weeklyUpdateSubmitted") : t("weeklyUpdateNotSubmitted")}
          </p>
        </div>
      </div>

      <p className="text-xs italic text-muted-foreground text-center">{t("dashboardEn")}</p>

      {/* Nav cards */}
      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => onNavigate?.(c.key)}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98] text-left"
          >
            <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
              <c.icon size={24} className={c.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{c.titleTa}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.titleEn}</p>
            </div>
            {c.key === "weekly" && !weekDone && (
              <span className="text-[10px] bg-warning/20 text-warning font-bold px-2 py-1 rounded-lg shrink-0">{t("pending")}</span>
            )}
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

    </div>
  );
};

export default HomeTab;
