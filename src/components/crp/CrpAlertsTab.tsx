import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, MessageCircle, X } from "lucide-react";
import { useHamlets, hamletDisplayName } from "@/hooks/use-hamlets";
import type { Hamlet } from "@/lib/api";

type TargetMode = "all" | "hamlet" | "shg";

const ShgMultiSelect = ({
  shgList,
  selected,
  setSelected,
}: {
  shgList: string[];
  selected: string[];
  setSelected: (s: string[]) => void;
}) => {
  const toggle = (name: string) => {
    setSelected(
      selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name]
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-lg">
              {s}
              <button onClick={() => toggle(s)} className="hover:text-danger">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Checkboxes */}
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
        {shgList.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">SHG குழுக்கள் இல்லை</p>
        )}
        {shgList.map((s) => (
          <label key={s} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${selected.includes(s) ? "bg-primary/10" : "hover:bg-muted/40"}`}>
            <input
              type="checkbox"
              checked={selected.includes(s)}
              onChange={() => toggle(s)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">{s}</span>
          </label>
        ))}
      </div>

      {/* Select all / clear */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelected([...shgList])}
          className="text-xs text-primary font-medium underline"
        >
          அனைத்தும் தேர்வு
        </button>
        <span className="text-muted-foreground text-xs">|</span>
        <button
          onClick={() => setSelected([])}
          className="text-xs text-danger font-medium underline"
        >
          நீக்கு
        </button>
        <span className="text-xs text-muted-foreground ml-auto">{selected.length} தேர்வு</span>
      </div>
    </div>
  );
};

const TargetSelector = ({
  mode, setMode,
  hamlet, setHamlet,
  selectedShgs, setSelectedShgs,
  shgList,
  hamlets, hamletsLoading, lang,
}: {
  mode: TargetMode; setMode: (m: TargetMode) => void;
  hamlet: string; setHamlet: (h: string) => void;
  selectedShgs: string[]; setSelectedShgs: (s: string[]) => void;
  shgList: string[];
  hamlets: Hamlet[]; hamletsLoading: boolean; lang: string;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex rounded-lg overflow-hidden border border-border">
      {(["all", "hamlet", "shg"] as TargetMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${
            mode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          {m === "all" ? "அனைவரும்" : m === "hamlet" ? "ஊர் வாரியாக" : "SHG குழு"}
        </button>
      ))}
    </div>

    {mode === "hamlet" && (
      <select
        value={hamlet}
        onChange={(e) => setHamlet(e.target.value)}
        disabled={hamletsLoading}
        className="border border-input rounded-md px-3 py-2.5 text-sm bg-card text-foreground disabled:opacity-60"
      >
        <option value="">{hamletsLoading ? "ஏற்றுகிறது..." : "ஊரை தேர்ந்தெடுக்கவும்"}</option>
        {!hamletsLoading && hamlets.length === 0 && (
          <option value="" disabled>ஊர்கள் இல்லை</option>
        )}
        {hamlets.map((h) => {
          const label = hamletDisplayName(h, lang);
          // Farmers' stored `hamlet` text is the Tamil name (nameTa || name), which is
          // what notification targeting matches on — send that regardless of UI language.
          return <option key={h._id} value={h.nameTa || h.name}>{label}</option>;
        })}
      </select>
    )}

    {mode === "shg" && (
      <ShgMultiSelect
        shgList={shgList}
        selected={selectedShgs}
        setSelected={setSelectedShgs}
      />
    )}
  </div>
);

const CrpAlertsTab = ({ user }: { user: User }) => {
  const { t, lang } = useLanguage();
  const [shgList, setShgList] = useState<string[]>([]);
  const { hamlets, hamletsLoading } = useHamlets();

  useEffect(() => {
    api.getShgGroups().then((data: any[]) => setShgList(data.map((g) => g.name))).catch(() => {});
  }, []);

  // Disease Alert state
  const [alertMode, setAlertMode]         = useState<TargetMode>("all");
  const [alertHamlet, setAlertHamlet]     = useState("");
  const [alertShgs, setAlertShgs]         = useState<string[]>([]);
  const [alertMsg, setAlertMsg]           = useState("");
  const [alertLoading, setAlertLoading]   = useState(false);

  // Farming Tip state
  const [tipMode, setTipMode]             = useState<TargetMode>("all");
  const [tipHamlet, setTipHamlet]         = useState("");
  const [tipShgs, setTipShgs]             = useState<string[]>([]);
  const [tipMsg, setTipMsg]               = useState("");
  const [tipLoading, setTipLoading]       = useState(false);

  // Market Price state
  const [priceMode, setPriceMode]         = useState<TargetMode>("all");
  const [priceHamlet, setPriceHamlet]     = useState("");
  const [priceShgs, setPriceShgs]         = useState<string[]>([]);
  const [broilerPrice, setBroilerPrice]   = useState("");
  const [chickPrice, setChickPrice]       = useState("");
  const [eggPrice, setEggPrice]           = useState("");
  const [priceDate, setPriceDate]         = useState(new Date().toISOString().split("T")[0]);
  const [priceLoading, setPriceLoading]   = useState(false);

  const whatsapp = (msg: string) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");

  const getTarget = (mode: TargetMode, hamlet: string, shgs: string[]) => ({
    hamlet:    mode === "hamlet" ? hamlet || undefined : undefined,
    shg_names: mode === "shg" && shgs.length > 0 ? shgs : undefined,
  });

  const handleSendAlert = async () => {
    if (!alertMsg.trim()) return;
    if (alertMode === "hamlet" && !alertHamlet)       { toast.error("ஊரை தேர்ந்தெடுக்கவும்"); return; }
    if (alertMode === "shg" && alertShgs.length === 0) { toast.error("குறைந்தது ஒரு SHG குழுவை தேர்ந்தெடுக்கவும்"); return; }
    setAlertLoading(true);
    try {
      await api.createNotification({ type: "disease", message: alertMsg, ...getTarget(alertMode, alertHamlet, alertShgs) });
      toast.success(t("alertSent") + " ✅");
      setAlertMsg("");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to send");
    } finally {
      setAlertLoading(false);
    }
  };

  const handleSendTip = async () => {
    if (!tipMsg.trim()) return;
    if (tipMode === "hamlet" && !tipHamlet)         { toast.error("ஊரை தேர்ந்தெடுக்கவும்"); return; }
    if (tipMode === "shg" && tipShgs.length === 0)  { toast.error("குறைந்தது ஒரு SHG குழுவை தேர்ந்தெடுக்கவும்"); return; }
    setTipLoading(true);
    try {
      await api.createNotification({ type: "tip", message: tipMsg, ...getTarget(tipMode, tipHamlet, tipShgs) });
      toast.success(t("tipSent") + " ✅");
      setTipMsg("");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to send");
    } finally {
      setTipLoading(false);
    }
  };

  const handleSendPrice = async () => {
    if (!broilerPrice && !chickPrice && !eggPrice) return;
    // The backend (POST /market) requires all three prices.
    if (!Number(broilerPrice) || !Number(chickPrice) || !Number(eggPrice)) {
      toast.error(lang === "ta" ? "மூன்று விலைகளையும் உள்ளிடவும்" : "Please enter all three prices");
      return;
    }
    if (priceMode === "hamlet" && !priceHamlet)          { toast.error("ஊரை தேர்ந்தெடுக்கவும்"); return; }
    if (priceMode === "shg" && priceShgs.length === 0)   { toast.error("குறைந்தது ஒரு SHG குழுவை தேர்ந்தெடுக்கவும்"); return; }
    setPriceLoading(true);
    try {
      await api.setMarketPrice({ broiler: Number(broilerPrice) || 0, chick: Number(chickPrice) || 0, egg: Number(eggPrice) || 0 });
      await api.createNotification({
        type: "market",
        message: `சந்தை விலை புதுப்பிப்பு: நாட்டுக்கோழி ₹${broilerPrice}/kg | நாட்டுக்கோழி குஞ்சுகள் ₹${chickPrice}/குஞ்சு | நாட்டுக்கோழி முட்டை ₹${eggPrice}/முட்டை (தேதி: ${priceDate})`,
        ...getTarget(priceMode, priceHamlet, priceShgs),
      });
      toast.success(t("priceSent") + " ✅");
      setBroilerPrice(""); setChickPrice(""); setEggPrice("");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to update price");
    } finally {
      setPriceLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Disease Alert */}
      <Card className="p-5 bg-card">
        <h2 className="text-lg font-bold mb-4 text-foreground">{t("sendDiseaseAlert")}</h2>
        <div className="flex flex-col gap-3">
          <TargetSelector
            mode={alertMode} setMode={setAlertMode}
            hamlet={alertHamlet} setHamlet={setAlertHamlet}
            selectedShgs={alertShgs} setSelectedShgs={setAlertShgs}
            shgList={shgList}
            hamlets={hamlets} hamletsLoading={hamletsLoading} lang={lang}
          />
          <Textarea value={alertMsg} onChange={(e) => setAlertMsg(e.target.value)} placeholder={t("message")} rows={3} className="text-base" />
          <Button onClick={handleSendAlert} disabled={!alertMsg.trim() || alertLoading} className="tap-target w-full bg-danger text-danger-foreground">
            {alertLoading ? <Loader2 className="animate-spin" size={18} /> : t("sendAlert")}
          </Button>
          <Button onClick={() => whatsapp(`🔴 நோய் எச்சரிக்கை: ${alertMsg}`)} disabled={!alertMsg.trim()} variant="outline" className="tap-target w-full gap-2 text-success border-success">
            <MessageCircle size={16} /> WhatsApp அனுப்பு
          </Button>
        </div>
      </Card>

      {/* Farming Tip */}
      <Card className="p-5 bg-card">
        <h2 className="text-lg font-bold mb-4 text-foreground">{t("poultryFarmingInfoTitle")}</h2>
        <div className="flex flex-col gap-3">
          <TargetSelector
            mode={tipMode} setMode={setTipMode}
            hamlet={tipHamlet} setHamlet={setTipHamlet}
            selectedShgs={tipShgs} setSelectedShgs={setTipShgs}
            shgList={shgList}
            hamlets={hamlets} hamletsLoading={hamletsLoading} lang={lang}
          />
          <Textarea value={tipMsg} onChange={(e) => setTipMsg(e.target.value)} placeholder={t("message")} rows={3} className="text-base" />
          <Button onClick={handleSendTip} disabled={!tipMsg.trim() || tipLoading} className="tap-target w-full bg-primary text-primary-foreground">
            {tipLoading ? <Loader2 className="animate-spin" size={18} /> : t("sendFarmingTip")}
          </Button>
          <Button onClick={() => whatsapp(`💡 விவசாய குறிப்பு: ${tipMsg}`)} disabled={!tipMsg.trim()} variant="outline" className="tap-target w-full gap-2 text-success border-success">
            <MessageCircle size={16} /> WhatsApp அனுப்பு
          </Button>
        </div>
      </Card>

      {/* Market Price */}
      <Card className="p-5 bg-card">
        <h2 className="text-lg font-bold mb-4 text-foreground">{t("marketPriceDetailsTitle")}</h2>
        <div className="flex flex-col gap-3">
          <TargetSelector
            mode={priceMode} setMode={setPriceMode}
            hamlet={priceHamlet} setHamlet={setPriceHamlet}
            selectedShgs={priceShgs} setSelectedShgs={setPriceShgs}
            shgList={shgList}
            hamlets={hamlets} hamletsLoading={hamletsLoading} lang={lang}
          />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("countryBroilerChicken")} (₹/kg)</label>
            <Input value={broilerPrice} onChange={(e) => setBroilerPrice(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="180" className="tap-target" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("countryChickenChicks")} (₹{t("chickUnit")})</label>
            <Input value={chickPrice} onChange={(e) => setChickPrice(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="45" className="tap-target" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("countryChickenEggs")} (₹{t("eggUnit")})</label>
            <Input value={eggPrice} onChange={(e) => setEggPrice(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="6.50" className="tap-target" />
          </div>
          <Input type="date" value={priceDate} onChange={(e) => setPriceDate(e.target.value)} />
          <Button onClick={handleSendPrice} disabled={(!broilerPrice && !chickPrice && !eggPrice) || priceLoading} className="tap-target bg-primary text-primary-foreground">
            {priceLoading ? <Loader2 className="animate-spin" size={18} /> : t("sendMarketPrice")}
          </Button>
          <Button
            onClick={() => whatsapp(`📊 சந்தை விலை: நாட்டுக்கோழி ₹${broilerPrice}/kg | நாட்டுக்கோழி குஞ்சுகள் ₹${chickPrice}/குஞ்சு | நாட்டுக்கோழி முட்டை ₹${eggPrice}/முட்டை (${priceDate})`)}
            disabled={!broilerPrice && !chickPrice && !eggPrice}
            variant="outline" className="tap-target gap-2 text-success border-success"
          >
            <MessageCircle size={16} /> WhatsApp அனுப்பு
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CrpAlertsTab;
