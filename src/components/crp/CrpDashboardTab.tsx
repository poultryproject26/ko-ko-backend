import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHamlets, hamletDisplayName } from "@/hooks/use-hamlets";
import {
  FileBarChart2,
  MessageSquare,
  Users,
  Activity,
  ChevronDown,
  ChevronUp,
  Bird,
  ClipboardList,
  Bug,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";

interface CrpDashboardTabProps {
  onNavigate?: (tab: "reports" | "alerts" | "services" | "approve") => void;
}

interface FarmerSummary {
  _id: string;
  name: string;
  phone: string;
  hamlet: string;
}

interface BirdUpdateSummary {
  _id: string;
  userId: { _id: string } | string;
  weekDate: string;
}

interface ActivityItem {
  _id: string;
  farmerName: string;
  hamlet: string;
  action: string;
  type: "bird" | "service" | "disease";
  createdAt: string;
}

function getThisWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const TYPE_ICON: Record<ActivityItem["type"], LucideIcon> = {
  bird: Bird,
  service: ClipboardList,
  disease: Bug,
};

const TYPE_COLOR: Record<ActivityItem["type"], string> = {
  bird: "bg-primary/10 text-primary",
  service: "bg-warning/10 text-warning",
  disease: "bg-danger/10 text-danger",
};

const isActivityType = (value: string): value is ActivityItem["type"] =>
  value === "bird" || value === "service" || value === "disease";

const CrpDashboardTab = ({ onNavigate }: CrpDashboardTabProps) => {
  const { t, lang } = useLanguage();
  const { hamlets, hamletsLoading } = useHamlets();
  const [showWeeklyDetail, setShowWeeklyDetail] = useState(false);
  const [weeklyView, setWeeklyView] = useState<"updated" | "not_updated">("not_updated");
  const [activityTab, setActivityTab] = useState<"unread" | "read">("unread");
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [readActivityIds, setReadActivityIds] = useState<string[]>([]);

  const { data: farmers = [] } = useQuery({
    queryKey: ["crpFarmers"],
    queryFn: async (): Promise<FarmerSummary[]> => api.getFarmers() as Promise<FarmerSummary[]>,
    staleTime: 60_000,
  });

  const { data: birdUpdates = [] } = useQuery({
    queryKey: ["allBirdUpdates"],
    queryFn: async (): Promise<BirdUpdateSummary[]> => api.getAllBirdUpdates() as Promise<BirdUpdateSummary[]>,
    staleTime: 60_000,
  });

  const { data: rawActivity = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: async (): Promise<ActivityItem[]> => api.getActivity() as Promise<ActivityItem[]>,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!rawActivity.length) return;
    const seen: string[] = JSON.parse(localStorage.getItem("seen_activity") || "[]");
    setReadActivityIds(seen);
    setActivityFeed(rawActivity.filter((a) => !seen.includes(a._id)));
  }, [rawActivity.length]);

  const markAsRead = (id: string) => {
    const seen: string[] = JSON.parse(localStorage.getItem("seen_activity") || "[]");
    if (!seen.includes(id)) seen.push(id);
    localStorage.setItem("seen_activity", JSON.stringify(seen));
    setReadActivityIds(seen);
    setActivityFeed((prev) => prev.filter((a) => a._id !== id));
  };

  const markAllAsRead = () => {
    const ids = activityFeed.map((a) => a._id);
    const seen: string[] = JSON.parse(localStorage.getItem("seen_activity") || "[]");
    const nextSeen = [...new Set([...seen, ...ids])];
    localStorage.setItem("seen_activity", JSON.stringify(nextSeen));
    setReadActivityIds(nextSeen);
    setActivityFeed([]);
  };

  const thisWeek = getThisWeek();
  const totalFarmers = farmers.length;

  const updatedUserIds = new Set(
    birdUpdates
      .filter((u) => u.weekDate === thisWeek && u.userId != null)
      .map((u) => (typeof u.userId === "string" ? u.userId : u.userId._id))
  );

  const totalUpdated = updatedUserIds.size;
  const totalNotUpdated = Math.max(0, totalFarmers - totalUpdated);

  const hamletUpdateStats = hamletsLoading ? [] : hamlets.map((h) => {
    const hamletName = hamletDisplayName(h, lang);
    const hf = farmers.filter((f) => f.hamlet === hamletName);
    const updated = hf.filter((f) => updatedUserIds.has(f._id)).length;
    return { hamlet: hamletName, updated, total: hf.length, notUpdated: hf.length - updated };
  }).filter((h) => h.total > 0);

  const StatRow = ({ label, value }: { label: string; value: number | string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-base font-bold text-foreground border border-input rounded-md px-3 py-1 min-w-[60px] text-center bg-muted/30">
        {value}
      </span>
    </div>
  );

  const actions: { key: "reports" | "alerts" | "services" | "approve"; label: string; icon: LucideIcon }[] = [
    { key: "reports", label: t("dataSummary"), icon: FileBarChart2 },
    { key: "alerts", label: t("sendSms"), icon: MessageSquare },
    { key: "services", label: "சேவை கோரிக்கைகள்", icon: Activity },
    { key: "approve", label: t("addNewMembers"), icon: Users },
  ];

  const readActivity = rawActivity.filter((a) => readActivityIds.includes(a._id));
  const selectedActivity = activityTab === "unread" ? activityFeed : readActivity;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-base font-bold text-foreground">{t("userTypeStaff")}</h2>
        <p className="text-xs italic text-muted-foreground mt-1">{t("dashboardEn")}</p>
      </div>

      {/* Weekly Update Counter */}
      <Card className="p-4 border-2 border-primary/30 bg-primary/5">
        <button className="w-full" onClick={() => setShowWeeklyDetail(!showWeeklyDetail)}>
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">இந்த வார பதிவு</p>
              <p className="text-xs text-muted-foreground">(This week's updates)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  {totalUpdated}
                  <span className="text-sm text-muted-foreground font-normal">/{totalFarmers}</span>
                </p>
                {totalNotUpdated > 0 ? (
                  <Badge className="bg-warning text-warning-foreground text-xs">{totalNotUpdated} பதிவிடவில்லை</Badge>
                ) : (
                  <Badge className="bg-success text-success-foreground text-xs">அனைவரும் ✅</Badge>
                )}
              </div>
              {showWeeklyDetail ? (
                <ChevronUp size={16} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={16} className="text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        {showWeeklyDetail && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex rounded-lg overflow-hidden border border-border mb-3">
              <button
                onClick={() => setWeeklyView("not_updated")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  weeklyView === "not_updated" ? "bg-warning text-warning-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                ❌ பதிவிடவில்லை ({totalNotUpdated})
              </button>
              <div className="w-px bg-border" />
              <button
                onClick={() => setWeeklyView("updated")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  weeklyView === "updated" ? "bg-success text-success-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                ✅ பதிவிட்டார்கள் ({totalUpdated})
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {hamletUpdateStats.map((h) => {
                const count = weeklyView === "not_updated" ? h.notUpdated : h.updated;
                if (count === 0) return null;
                const relevantFarmers = farmers.filter(
                  (f) => f.hamlet === h.hamlet && (weeklyView === "updated" ? updatedUserIds.has(f._id) : !updatedUserIds.has(f._id))
                );
                return (
                  <div key={h.hamlet} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-foreground">{h.hamlet}</p>
                      <Badge className={weeklyView === "not_updated" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}>
                        {count}/{h.total}
                      </Badge>
                    </div>
                    {relevantFarmers.map((f) => (
                      <div key={f._id} className="flex items-center justify-between py-1 border-t border-border/30">
                        <span className="text-xs text-foreground">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{f.phone}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Stat counts */}
      <Card className="p-4 bg-card">
        <StatRow label={t("totalMembersCount")} value={totalFarmers} />
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Card
            key={a.key}
            onClick={() => onNavigate?.(a.key)}
            className="p-4 bg-card cursor-pointer hover:bg-muted/40 border-2 flex flex-col items-center justify-center text-center gap-2 min-h-[90px]"
          >
            <a.icon size={24} className="text-primary" />
            <p className="text-sm font-medium text-foreground leading-tight">{a.label}</p>
          </Card>
        ))}
      </div>

      {/* Activity Feed */}
      <Card className="overflow-hidden border border-border/70 bg-card shadow-sm">
        <div className="bg-muted/30 px-4 py-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 pr-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Activity size={20} />
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-bold leading-tight text-foreground">சமீப செயல்பாடுகள்</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Read மற்றும் Unread அறிவிப்புகள்</p>
              </div>
            </div>

            <button
              onClick={markAllAsRead}
              disabled={activityFeed.length === 0}
              className="flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold leading-tight text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <CheckCircle2 size={14} />
            படித்ததாகக் குறிக்கவும்
            </button>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card">
            <button
              onClick={() => setActivityTab("unread")}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${
                activityTab === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Unread ({activityFeed.length})
            </button>
            <button
              onClick={() => setActivityTab("read")}
              className={`border-l border-border px-3 py-2 text-sm font-semibold transition-colors ${
                activityTab === "read" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Read ({readActivity.length})
            </button>
          </div>
        </div>

        <div className="p-3">
          {selectedActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {activityTab === "unread" ? "Unread அறிவிப்புகள் இல்லை" : "Read அறிவிப்புகள் இல்லை"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedActivity.map((a) => {
                const type: ActivityItem["type"] = isActivityType(a.type) ? a.type : "service";
                const Icon = TYPE_ICON[type];
                const config = TYPE_COLOR[type];

                return (
                  <div key={a._id} className="rounded-lg border border-border/70 bg-card p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config}`}>
                        <Icon size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 min-w-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">{a.farmerName}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {a.hamlet} • {formatDateTime(a.createdAt)}
                            </p>
                          </div>
                        </div>

                        <p className="break-words text-sm leading-relaxed text-foreground">{a.action}</p>

                        <div className="mt-3 flex justify-end">
                          {activityTab === "unread" ? (
                            <button
                              onClick={() => markAsRead(a._id)}
                              className="min-h-8 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold leading-tight text-primary transition-colors hover:bg-primary/15"
                            >
                              Mark as read
                            </button>
                          ) : (
                            <Badge className="bg-success/10 text-success">Read</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CrpDashboardTab;
