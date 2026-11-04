import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ChooseActionScreenProps {
  onRegister: () => void;
  onLogin: (phone: string) => void;
}

const ChooseActionScreen = ({ onRegister, onLogin }: ChooseActionScreenProps) => {
  const { t, lang, setLang } = useLanguage();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    await onLogin(phone);
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "linear-gradient(160deg, #f1f8e9 0%, #e8f5e9 50%, #f9fbe7 100%)" }}>
      {/* Hero banner */}
      <div className="relative agri-header-gradient px-6 pt-14 pb-10 flex flex-col items-center text-center">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            className="text-xs font-bold border border-white/30 rounded-lg px-2.5 py-1 text-white/80 hover:text-white hover:border-white/60 bg-white/10"
          >
            {lang === "ta" ? "EN" : "தமிழ்"}
          </button>
        </div>

        {/* Logo row: TANUVAS | KO-KO | VCRI Namakkal */}
        <div className="flex items-center justify-center gap-4 min-[360px]:gap-6 mb-4">
          <div className="w-[72px] h-[72px] min-[360px]:w-[84px] min-[360px]:h-[84px] shrink-0 rounded-full bg-white border-2 border-white/40 p-0.5 shadow-lg overflow-hidden">
            <img src="/logo-tanuvas.jpeg" alt="Tamil Nadu Veterinary and Animal Sciences University" className="w-full h-full object-contain rounded-full" />
          </div>
          <div className="w-[72px] h-[72px] min-[360px]:w-[84px] min-[360px]:h-[84px] shrink-0 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <div className="w-[72px] h-[72px] min-[360px]:w-[84px] min-[360px]:h-[84px] shrink-0 rounded-full bg-white border-2 border-white/40 p-0.5 shadow-lg overflow-hidden">
            <img src="/logo-vcri-namakkal.jpeg" alt="Veterinary College and Research Institute, Namakkal" className="w-full h-full object-contain rounded-full" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white leading-tight tracking-wide">{t("appNameTamil")}</h1>
        <p className="text-sm text-white/80 mt-1.5 font-medium">{t("appTagline")}</p>

      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        {/* New user registration */}
        <button
          onClick={onRegister}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-primary/30 shadow-sm hover:border-primary hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">📝</div>
          <div className="text-left flex-1">
            <p className="text-base font-bold text-foreground">{t("newRegistration")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("newRegistrationSub")}</p>
          </div>
          <span className="text-primary text-lg">›</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium px-2">{t("orLogin")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-base">📱</div>
            <p className="text-base font-bold text-foreground">{t("login")}</p>
          </div>

          <div>
            <Label className="text-sm font-semibold text-foreground mb-2 block">{t("phoneNumber")}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="tap-target text-lg font-semibold tracking-widest border-2 focus:border-primary rounded-xl"
              placeholder="98765 43210"
              inputMode="numeric"
              type="tel"
            />
          </div>

          <Button
            onClick={handleLogin}
            disabled={phone.length !== 10 || loading}
            className="tap-target w-full text-base font-bold rounded-xl shadow-sm disabled:opacity-40"
            style={{ background: phone.length === 10 ? "linear-gradient(135deg, #2E7D32, #4CAF50)" : undefined }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : t("login") + " →"}
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-2">{t("dataSecured")}</p>
      </div>
    </div>
  );
};

export default ChooseActionScreen;
