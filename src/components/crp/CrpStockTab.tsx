import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/mockData";
import { useHamlets, hamletDisplayName } from "@/hooks/use-hamlets";
import { MessageCircle, ShoppingBag, Phone } from "lucide-react";
import { toast } from "sonner";

const CrpStockTab = () => {
  const { t, lang } = useLanguage();
  const { hamlets, hamletsLoading } = useHamlets();
  const [stocks, setStocks] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<"available" | "sold">("available");
  const [hamletFilter, setHamletFilter] = useState("");
  const [soldLoading, setSoldLoading] = useState<string | null>(null);

  useEffect(() => {
    api.getSaleStocks().then(setStocks).catch(() => {});
  }, [refresh]);

  const available = stocks.filter((s) => s.status === "available");
  const sold      = stocks.filter((s) => s.status === "sold");

  const filtered = (tab === "available" ? available : sold)
    .filter((s) => !hamletFilter || s.hamlet === hamletFilter);

  // Summary totals across all available
  const totalBroilers = available.reduce((sum, s) => sum + (s.broilers || 0), 0);
  const totalChicks   = available.reduce((sum, s) => sum + (s.chicks   || 0), 0);
  const totalEggs     = available.reduce((sum, s) => sum + (s.eggs     || 0), 0);

  const handleMarkSold = async (id: string) => {
    if (soldLoading) return;
    setSoldLoading(id);
    try {
      await api.markSold(id);
      toast.success(`${t("markedAsSold")} ✅`);
      setRefresh((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "விற்பனை பதிவு செய்ய முடியவில்லை");
    } finally {
      setSoldLoading(null);
    }
  };

  const handleWhatsapp = (s: any) => {
    const msg =
      `${t("whatsappShareHeader")}\n` +
      `${t("broilerChicken")}: ${s.broilers} | ${t("chick")}: ${s.chicks} | ${t("egg")}: ${s.eggs}\n` +
      `${t("dateLabel")}: ${formatDate(s.createdAt)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleShareAll = () => {
    if (available.length === 0) return;
    const list = available
      .filter((s) => !hamletFilter || s.hamlet === hamletFilter);
    const lines = list.map((s) =>
      `• ${t("broilerChicken")}:${s.broilers} ${t("chick")}:${s.chicks} ${t("egg")}:${s.eggs} (${formatDate(s.createdAt)})`
    ).join("\n");
    const msg = `${t("whatsappShareHeaderAll")}\n${lines}\n\n${t("total")}: ${t("broilerChicken")} ${totalBroilers} | ${t("chick")} ${totalChicks} | ${t("egg")} ${totalEggs}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("saleStock")}</h2>
        {available.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleShareAll} className="gap-1 text-success border-success text-xs">
            <MessageCircle size={13} /> {t("shareAll")}
          </Button>
        )}
      </div>

      {/* Summary totals */}
      {available.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/30 border-2">
          <p className="text-xs font-bold text-primary mb-2">{t("totalAvailableStock")}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t("broilerChicken"), value: totalBroilers },
              { label: t("chick"),    value: totalChicks },
              { label: t("egg"),   value: totalEggs },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card rounded-lg p-2 text-center border border-border">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("fromFarmersCount").replace("{count}", available.length.toString())}
          </p>
        </Card>
      )}

      {/* Hamlet filter */}
      <select
        value={hamletFilter}
        onChange={(e) => setHamletFilter(e.target.value)}
        disabled={hamletsLoading}
        className="border border-input rounded-md px-3 py-2 text-sm bg-card text-foreground disabled:opacity-60"
      >
        <option value="">{hamletsLoading ? t("loading") : t("allHamlets")}</option>
        {hamlets.map((h) => {
          const label = hamletDisplayName(h, lang);
          return <option key={h._id} value={label}>{label}</option>;
        })}
      </select>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("available")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            tab === "available" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
          }`}
        >
          {t("available")} ({available.length})
        </button>
        <button
          onClick={() => setTab("sold")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            tab === "sold" ? "bg-success text-success-foreground border-success" : "border-border text-muted-foreground"
          }`}
        >
          {t("sold")} ({sold.length})
        </button>
      </div>

      {/* Stock cards */}
      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">{tab === "available" ? t("noSaleStock") : t("noSaleHistory")}</p>
        </Card>
      ) : (
        filtered.map((s) => (
          <Card key={s._id} className="p-4 bg-card">
            {/* Farmer info */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-foreground">{s.farmerName}</p>
                <p className="text-xs text-muted-foreground">{s.hamlet}</p>
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-xs text-primary mt-0.5">
                    <Phone size={11} /> {s.phone}
                  </a>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{t("registration")}: {formatDate(s.createdAt)}</p>
                {s.soldAt && <p className="text-xs text-muted-foreground">{t("sold")}: {formatDate(s.soldAt)}</p>}
              </div>
              <Badge className={s.status === "sold" ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}>
                {s.status === "sold" ? `✅ ${t("soldBadge")}` : `🟢 ${t("availableBadge")}`}
              </Badge>
            </div>

            {/* Stock counts */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: t("broilerChicken"), value: s.broilers, color: "text-orange-600" },
                { label: t("chick"),    value: s.chicks,   color: "text-yellow-600" },
                { label: t("egg"),   value: s.eggs,     color: "text-blue-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/40 rounded-lg p-2 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <p className="text-xs text-muted-foreground text-right mb-3">
              {t("total")}: <span className="font-bold text-foreground">{(s.broilers || 0) + (s.chicks || 0) + (s.eggs || 0)}</span>
            </p>

            {/* Actions */}
            {s.status === "available" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleMarkSold(s._id)}
                  disabled={soldLoading === s._id}
                  className="flex-1 tap-target bg-success text-success-foreground text-sm gap-1.5"
                >
                  <ShoppingBag size={16} />
                  {soldLoading === s._id ? "..." : t("sold")}
                </Button>
                <Button variant="outline" onClick={() => handleWhatsapp(s)} className="flex-1 tap-target gap-1.5 text-success border-success text-sm">
                  <MessageCircle size={16} /> WhatsApp
                </Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
};

export default CrpStockTab;
