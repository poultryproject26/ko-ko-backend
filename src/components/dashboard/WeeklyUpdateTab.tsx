import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/mockData";
import {
  formatVaccinationCalendarDate,
  getVaccinationStockDueDate,
} from "@/lib/vaccinationDates";
import { Minus, Plus, Loader2, Bird, ShoppingCart, Syringe } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const WeeklyUpdateTab = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Bird count — 2 categories
  const [within3Months, setWithin3Months] = useState(0);
  const [above3Months, setAbove3Months] = useState(0);

  // Sale stock
  const [saleBroiler, setSaleBroiler] = useState(0);
  const [saleChicks, setSaleChicks] = useState(0);
  const [saleEggs, setSaleEggs] = useState(0);

  // Vaccination stock — 4 categories
  const [vaxWithin1Month, setVaxWithin1Month] = useState(0);
  const [vax2Month, setVax2Month] = useState(0);
  const [vax3Month, setVax3Month] = useState(0);
  const [vax4to7Month, setVax4to7Month] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [vaxLoading, setVaxLoading] = useState(false);
  const [birdResetKey, setBirdResetKey] = useState(0);
  const [saleResetKey, setSaleResetKey] = useState(0);
  const [vaxResetKey, setVaxResetKey] = useState(0);

  const { data: pastUpdates = [] } = useQuery({
    queryKey: ["birdUpdates"],
    queryFn: () => api.getBirdUpdates(),
    staleTime: 30_000,
  });

  const birdTotal = within3Months + above3Months;
  const saleTotal = saleBroiler + saleChicks + saleEggs;
  const vaxTotal = vaxWithin1Month + vax2Month + vax3Month + vax4to7Month;

  const Counter = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const [inputVal, setInputVal] = useState(String(value));
    useEffect(() => { setInputVal(String(value)); }, [value]);
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:bg-muted/70 border border-border">
          <Minus size={15} />
        </button>
        <input
          type="number" min={0} value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={() => { const v = parseInt(inputVal); const safe = isNaN(v) || v < 0 ? 0 : v; onChange(safe); setInputVal(String(safe)); }}
          className="w-14 text-center text-lg font-bold text-foreground border-2 border-input rounded-xl py-1.5 bg-white focus:outline-none focus:border-primary"
        />
        <button onClick={() => onChange(value + 1)} className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:opacity-80 shadow-sm">
          <Plus size={15} />
        </button>
      </div>
    );
  };

  const Row = ({ label, sub, value, onChange }: { label: string; sub?: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center justify-between py-3 gap-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground leading-tight block">{label}</span>
        {sub && <span className="text-[11px] text-primary font-semibold">{sub}</span>}
      </div>
      <Counter value={value} onChange={onChange} />
    </div>
  );

  const handleSubmitBirds = async () => {
    setLoading(true);
    try {
      await api.submitBirdUpdate({ chicks: within3Months, growers: 0, layers: above3Months, broilers: 0 });
      toast.success(t("updateSubmitted") + " ✅");
      setWithin3Months(0); setAbove3Months(0);
      setBirdResetKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["birdUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["checkWeek"] });
    } catch (err: any) {
      toast.error(err.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSale = async () => {
    setSaleLoading(true);
    try {
      await api.submitSaleStock({ broilers: saleBroiler, chicks: saleChicks, eggs: saleEggs });
      toast.success(t("saleInfoSavedToast") + " ✅");
      setSaleBroiler(0); setSaleChicks(0); setSaleEggs(0);
      setSaleResetKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.message || "Submit failed");
    } finally {
      setSaleLoading(false);
    }
  };

  const handleSubmitVaccinationStock = async () => {
    setVaxLoading(true);
    try {
      const savedRequest = await api.submitVaccinationStock({
        withinMonth: vaxWithin1Month,
        month2: vax2Month,
        month3: vax3Month,
        month4Plus: vax4to7Month,
      });
      toast.success(t("vaxStockSavedToast") + " ✅");
      const dueDate = getVaccinationStockDueDate(savedRequest);
      toast(t("vaxDateNotifyToast").replace("{date}", formatVaccinationCalendarDate(dueDate)));
      setVaxWithin1Month(0); setVax2Month(0); setVax3Month(0); setVax4to7Month(0);
      setVaxResetKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["vaccinationStock"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    } catch (err: any) {
      toast.error(err.message || err.error || "Submit failed");
    } finally {
      setVaxLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Bird count card — 2 categories */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden" key={`bird-${birdResetKey}`}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #2E7D32, #4CAF50)" }}>
          <Bird size={20} className="text-white" />
          <div>
            <h2 className="text-sm font-bold text-white">{t("birdsUpdate")}</h2>
            <p className="text-[11px] text-white/75">{t("birdsUpdateEn")}</p>
          </div>
        </div>
        <div className="p-4">
          <Row label={t("under3MonthsAge")} value={within3Months} onChange={setWithin3Months} />
          <Row label={t("above3MonthsAge")} value={above3Months} onChange={setAbove3Months} />
          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="text-sm text-muted-foreground">{t("total")}</span>
            <span className="text-xl font-bold text-primary">{birdTotal}</span>
          </div>
          <Button
            onClick={handleSubmitBirds}
            disabled={birdTotal === 0 || loading}
            className="tap-target w-full text-base font-bold mt-4 rounded-xl shadow-sm disabled:opacity-40"
            style={{ background: birdTotal > 0 ? "linear-gradient(135deg, #2E7D32, #4CAF50)" : undefined }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : t("saveBirdCount")}
          </Button>
        </div>
      </div>

      {/* Sale stock card */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden" key={`sale-${saleResetKey}`}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #8D6E63, #A1887F)" }}>
          <ShoppingCart size={20} className="text-white" />
          <div>
            <h3 className="text-sm font-bold text-white">{t("saleableReady")}</h3>
            <p className="text-[11px] text-white/75">{t("saleableReadySub")}</p>
          </div>
        </div>
        <div className="p-4">
          <Row label={t("countryBroilerChicken")} value={saleBroiler} onChange={setSaleBroiler} />
          <Row label={t("countryChickenChicks")} value={saleChicks} onChange={setSaleChicks} />
          <Row label={t("countryChickenEggs")} value={saleEggs} onChange={setSaleEggs} />
          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="text-sm text-muted-foreground">{t("total")}</span>
            <span className="text-xl font-bold text-[#8D6E63]">{saleTotal}</span>
          </div>
          <Button
            onClick={handleSubmitSale}
            disabled={saleTotal === 0 || saleLoading}
            className="tap-target w-full text-base font-bold mt-4 rounded-xl shadow-sm disabled:opacity-40 bg-success text-success-foreground hover:bg-success/90"
          >
            {saleLoading ? <Loader2 className="animate-spin" size={20} /> : t("saveSaleInfo")}
          </Button>
        </div>
      </div>

      {/* Vaccination stock card — 4 categories */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden" key={`vax-${vaxResetKey}`}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #00695C, #009688)" }}>
          <Syringe size={20} className="text-white" />
          <div>
            <h3 className="text-sm font-bold text-white">{t("vaccinationStockTitle")}</h3>
            <p className="text-[11px] text-white/75">{t("vaccinationStockSubtitle")}</p>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-3 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
            <p className="text-xs text-teal-800 font-semibold">
              📅 {t("vaxDateNotePrefix")}
            </p>
            <p className="text-[11px] text-teal-700 mt-0.5">{t("vaxNoteSent")}</p>
          </div>

          <Row label={t("vaxWithinMonthAgeLabel")} sub={t("vaxSubLasota")} value={vaxWithin1Month} onChange={setVaxWithin1Month} />
          <Row label={t("vax2MonthAgeLabel")} sub={t("vaxSubFowlPox")} value={vax2Month} onChange={setVax2Month} />
          <Row label={t("vax3MonthAgeLabel")} sub={t("vaxSubInfectiousCoryza")} value={vax3Month} onChange={setVax3Month} />
          <Row label={t("vax4to7MonthAgeLabel")} sub={t("vaxSubRdvkDeworming")} value={vax4to7Month} onChange={setVax4to7Month} />

          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="text-sm text-muted-foreground">{t("total")}</span>
            <span className="text-xl font-bold text-[#00695C]">{vaxTotal}</span>
          </div>
          <Button
            onClick={handleSubmitVaccinationStock}
            disabled={vaxTotal === 0 || vaxLoading}
            className="tap-target w-full text-base font-bold mt-4 rounded-xl shadow-sm disabled:opacity-40"
            style={{ background: vaxTotal > 0 ? "linear-gradient(135deg, #00695C, #009688)" : undefined }}
          >
            {vaxLoading ? <Loader2 className="animate-spin" size={20} /> : t("saveVaccinationStockButton")}
          </Button>
        </div>
      </div>

      {/* Past bird updates table */}
      {pastUpdates.length > 0 && (
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
            <h2 className="text-sm font-bold text-foreground">{t("pastUpdates")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left py-2.5 px-4 text-muted-foreground font-semibold">{t("week")}</th>
                  <th className="text-center py-2.5 px-2 text-muted-foreground font-semibold">3 மாதத்திற்குள்</th>
                  <th className="text-center py-2.5 px-2 text-muted-foreground font-semibold">3 மாதத்திற்கு மேல்</th>
                  <th className="text-center py-2.5 px-2 text-muted-foreground font-semibold">{t("total")}</th>
                </tr>
              </thead>
              <tbody>
                {pastUpdates.map((u: any, i: number) => (
                  <tr key={u._id} className={`border-b border-border/40 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="py-2.5 px-4 text-foreground font-medium">{formatDate(u.weekDate)}</td>
                    <td className="text-center py-2.5 px-2 text-foreground">{u.chicks}</td>
                    <td className="text-center py-2.5 px-2 text-foreground">{u.layers}</td>
                    <td className="text-center py-2.5 px-2 font-bold text-primary">{u.chicks + u.layers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyUpdateTab;
