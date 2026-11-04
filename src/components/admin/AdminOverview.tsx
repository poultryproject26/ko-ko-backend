import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { api, AdminOverview as AdminOverviewData } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Users, UserCog, MapPinned, Bird, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const AdminOverview = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getAdminOverview());
    } catch (err: any) {
      setError(err?.message || t("adminLoadFailedToast"));
      toast.error(err?.message || t("adminLoadFailedToast"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const tiles: { key: string; label: string; value: number | null; icon: LucideIcon; accent: string; bar: string }[] = [
    { key: "crps", label: t("totalCrps"), value: data?.totalCrps ?? null, icon: UserCog, accent: "bg-primary/10 text-primary", bar: "bg-primary" },
    { key: "farmers", label: t("totalFarmers"), value: data?.totalFarmers ?? null, icon: Users, accent: "bg-success/10 text-success", bar: "bg-success" },
    { key: "hamlets", label: t("totalHamlets"), value: data?.totalHamlets ?? null, icon: MapPinned, accent: "bg-sky-500/10 text-sky-700", bar: "bg-sky-500" },
    { key: "birds", label: t("totalActiveBirds"), value: data?.totalActiveBirds ?? null, icon: Bird, accent: "bg-warning/10 text-warning", bar: "bg-warning" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("adminOverview")}</h2>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {t("refresh")}
        </Button>
      </div>

      {error ? (
        <Card className="p-0 overflow-hidden border-border/60 shadow-sm">
          <div className="flex flex-col items-center gap-2 py-16">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>{t("refresh")}</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiles.map((tile) => (
            <Card key={tile.key} className="relative overflow-hidden p-5 flex flex-col gap-4 border-border/60 hover:shadow-md transition-shadow">
              <div className={`absolute inset-x-0 top-0 h-1 ${tile.bar}`} />
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground leading-snug">{tile.label}</span>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tile.accent}`}>
                  <tile.icon size={20} />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground tabular-nums">
                {loading ? (
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                ) : (
                  (tile.value ?? 0).toLocaleString()
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Always visible — not a tooltip — so the estimate caveat can't be missed. */}
      <Card className="p-4 border border-warning/40 border-l-4 border-l-warning bg-warning/5 flex items-start gap-3">
        <Info size={18} className="text-warning shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          <span className="font-semibold">{t("totalActiveBirds")}:</span>{" "}
          {t("activeBirdsEstimateNote")}
        </p>
      </Card>
    </div>
  );
};

export default AdminOverview;
