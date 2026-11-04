import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/mockData";
import { Loader2, Wheat, Wrench, Syringe, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage, TranslationKey } from "@/i18n/LanguageContext";

const FEED_OPTIONS = ["மூட்டை தீவனம்", "கம்பு", "சோளம்", "இதர"];
const EQUIPMENT_OPTIONS = ["கூண்டு", "கூடை", "கம்பி வலை", "வலை"];

const REQUEST_TYPE_KEYS = [
  { type: "Feed Stock",   icon: Wheat,   labelKey: "feedLabel",              color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200" },
  { type: "Equipment",   icon: Wrench,  labelKey: "equipmentLabel",          color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200" },
  { type: "Vaccination", icon: Syringe, labelKey: "vaccinationRequestLabel", color: "text-green-600",  bg: "bg-green-50",   border: "border-green-200" },
] as const;

// Vaccination is no longer offered as a new request type (it has its own
// requirement flow); REQUEST_TYPE_KEYS still labels past Vaccination requests.
const SELECTABLE_REQUEST_TYPES = REQUEST_TYPE_KEYS.filter((r) => r.type !== "Vaccination");

const statusConfig: Record<string, { labelKey: TranslationKey; className: string }> = {
  Pending:   { labelKey: "pending",   className: "bg-warning text-warning-foreground" },
  Completed: { labelKey: "approved",  className: "bg-success text-success-foreground" },
  Rejected:  { labelKey: "rejected",  className: "bg-destructive text-destructive-foreground" },
};

const ServiceRequestTab = () => {
  const { t, lang, setLang } = useLanguage();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [option, setOption] = useState("");
  const [otherText, setOtherText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const { data: allDemands = [] } = useQuery({
    queryKey: ["serviceDemands"],
    queryFn: () => api.getServiceDemands(),
    staleTime: 30_000,
  });
  const requests = allDemands.filter((d: any) => ["Feed Stock", "Equipment", "Vaccination"].includes(d.type));

  const handleSelectType = (type: string) => {
    setSelected(selected === type ? null : type);
    setOption("");
    setOtherText("");
    setQuantity("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (selected !== "Vaccination" && !option) {
      toast.error(lang === "ta" ? "ஒரு விருப்பத்தை தேர்ந்தெடுக்கவும்" : "Please select an option");
      return;
    }
    if (selected !== "Vaccination" && !quantity) {
      toast.error(lang === "ta" ? "அளவை உள்ளிடவும்" : "Please enter quantity");
      return;
    }
    setLoading(true);
    try {
      const finalOption = option === "இதர" ? `இதர: ${otherText}` : option;
      await api.submitServiceDemand({
        type: selected,
        quantity: Number(quantity) || 1,
        option: finalOption || undefined,
        notes: notes || undefined,
      });
      toast.success(lang === "ta" ? "கோரிக்கை அனுப்பப்பட்டது ✅" : "Request submitted ✅");
      setSelected(null); setOption(""); setOtherText(""); setQuantity(""); setNotes("");
      queryClient.invalidateQueries({ queryKey: ["serviceDemands"] });
    } catch (err: any) {
      toast.error(err.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  const currentOptions = selected === "Feed Stock" ? FEED_OPTIONS : selected === "Equipment" ? EQUIPMENT_OPTIONS : [];
  const quantityUnit = selected === "Feed Stock" ? "கிலோ" : "கோழிகளுக்கு";

  return (
    <div className="flex flex-col gap-5">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            className="text-xs font-bold border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground bg-muted/20"
          >
            {lang === "ta" ? "EN" : "தமிழ்"}
          </button>
        </div>
        <div className="relative">
          <div className="rounded-2xl p-4 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #8D6E63, #A1887F)" }}>
            <div className="flex items-center gap-3">
              <ClipboardList size={22} className="text-white" />
              <div>
                <p className="text-base font-bold">{t("serviceRequestTitle")}</p>
                <p className="text-xs opacity-80">(Service Request to CRP)</p>
              </div>
            </div>
          </div>

      {/* Request type selection */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex flex-col gap-4">
        <p className="text-sm font-bold text-foreground">{t("selectRequestType")}</p>
        <div className="flex flex-col gap-2.5">
          {SELECTABLE_REQUEST_TYPES.map(({ type, icon: Icon, labelKey, color, bg, border }) => (
            <button
              key={type}
              onClick={() => handleSelectType(type)}
              className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all text-left ${
                selected === type ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:border-border"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center shrink-0`}>
                <Icon size={20} className={color} />
              </div>
              <span className="text-sm font-semibold text-foreground">{t(labelKey)}</span>
              {selected === type && <span className="ml-auto text-primary text-lg">✓</span>}
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex flex-col gap-3 pt-3 border-t border-border/40">

            {/* Options for Feed / Equipment */}
            {currentOptions.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  {selected === "Feed Stock" ? "தீவன வகை" : "உபகரண வகை"} <span className="text-danger">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setOption(opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        option === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {option === "இதர" && (
                  <Input
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="குறிப்பிடுக..."
                    className="mt-2 tap-target border-2 rounded-xl"
                  />
                )}
              </div>
            )}

            {/* Quantity */}
            {selected !== "Vaccination" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {lang === "ta" ? "அளவு" : "Quantity"} ({quantityUnit}) <span className="text-danger">*</span>
                </label>
                <Input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder={`____ ${quantityUnit}`}
                  className="tap-target border-2 focus:border-primary rounded-xl"
                />
              </div>
            )}

            {/* Description — optional */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">
                {lang === "ta" ? "விளக்கம்" : "Description"} ({lang === "ta" ? "விருப்பமானால்" : "optional"})
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="உங்கள் கருத்துக்களை குறிப்பிடுக"
                rows={2}
                className="tap-target border-2 rounded-xl text-sm"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || (selected !== "Vaccination" && (!option || !quantity))}
              className="tap-target w-full font-bold rounded-xl shadow-sm disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #2E7D32, #4CAF50)" }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : t("send") + " →"}
            </Button>
          </div>
        )}
      </div>

      {/* Past requests */}
      {requests.length > 0 && (
        <div>
          <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-3 px-1">
            <p className="text-sm font-bold text-foreground">{t("serviceDemands")} ({requests.length})</p>
            {open ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
          </button>
          {open && (
            <div className="flex flex-col gap-3">
              {requests.map((r: any) => {
                const config = statusConfig[r.status] ?? statusConfig.Pending;
                const rt = REQUEST_TYPE_KEYS.find((x) => x.type === r.type);
                const RIcon = rt?.icon;
                return (
                  <div key={r._id} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {RIcon && <RIcon size={15} className={rt?.color} />}
                        <p className="text-sm font-bold text-foreground">{rt ? t(rt.labelKey) : r.type}</p>
                      </div>
                      <Badge className={config.className + " text-xs"}>{t(config.labelKey)}</Badge>
                    </div>
                    {r.option && <p className="text-xs font-semibold text-primary mt-0.5">{r.option}</p>}
                    {r.quantity > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {r.quantity} {r.type === "Feed Stock" ? "கிலோ" : r.type === "Equipment" ? "கோழிகளுக்கு" : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(r.createdAt)}</p>
                    {r.notes && <p className="text-xs text-foreground mt-2 bg-muted/40 px-3 py-2 rounded-xl">{r.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-border/60 p-8 text-center">
          <ClipboardList size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        </div>
      )}
    </div>
  </div>
  );
};

export default ServiceRequestTab;
