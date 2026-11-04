import { useLanguage } from "@/i18n/LanguageContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Drumstick, Egg, Bird, TrendingUp, RefreshCw } from "lucide-react";

function formatTamilDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const MarketPricesTab = () => {
  const { t } = useLanguage();
  const { data: price, isLoading } = useQuery({
    queryKey: ["marketPrice"],
    queryFn: () => api.getMarketPrice(),
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-4 h-16 animate-pulse bg-muted" />
        {[1,2,3].map((i) => <div key={i} className="bg-white rounded-2xl border border-border/60 p-5 h-24 animate-pulse" />)}
      </div>
    );
  }

  if (!price) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center mb-4">
          <TrendingUp size={36} className="text-muted-foreground/50" />
        </div>
        <p className="text-base font-semibold text-foreground">{t("noPriceData")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("contactCRP")}</p>
      </div>
    );
  }

  const items = [
    { icon: Drumstick, labelKey: "broilerPriceLabel", sublabel: "Desi Chicken",        value: price.broiler, unit: "/ kg",      color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
    { icon: Bird,      labelKey: "chickPriceLabel",   sublabel: "Desi Chicken Chicks", value: price.chick,   unit: t("chickUnit"), color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
    { icon: Egg,       labelKey: "eggPriceLabel",     sublabel: "Desi Chicken Eggs",   value: price.egg,     unit: t("eggUnit"),   color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #F9A825, #FFB300)" }}>
        <div className="flex items-center gap-3">
          <TrendingUp size={22} className="text-white" />
          <div>
            <p className="text-base font-bold">{t("marketPriceTitle")}</p>
            <p className="text-xs opacity-80">(Current Market Status)</p>
          </div>
        </div>
      </div>

      {items.map((it, i) => (
        <div key={i} className={`bg-white rounded-2xl border ${it.border} shadow-sm p-5`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${it.bg} flex items-center justify-center shrink-0`}>
              <it.icon size={28} className={it.color} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium">{t(it.labelKey)}</p>
              <p className="text-xs text-muted-foreground/70">{it.sublabel}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-3xl font-bold text-foreground">₹{it.value}</p>
                <span className="text-sm text-muted-foreground font-normal">{it.unit}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-muted/30 rounded-xl px-4 py-3 flex items-center gap-2">
        <RefreshCw size={13} className="text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">{t("lastUpdated")}: <span className="font-medium text-foreground">{formatTamilDate(price.updatedAt)}</span></p>
          <p className="text-xs text-muted-foreground">{t("updatedBy")}: <span className="font-medium text-foreground">{price.updatedBy}</span></p>
        </div>
      </div>
    </div>
  );
};

export default MarketPricesTab;
