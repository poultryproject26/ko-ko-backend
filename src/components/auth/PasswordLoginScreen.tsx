import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { User } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageContext";
import { isValidFourDigitPassword } from "@/lib/authValidation";

interface PasswordLoginScreenProps {
  phone: string;
  onBack: () => void;
  onLoginSuccess: (user: User, token: string) => void;
}

const PasswordLoginScreen = ({ phone, onBack, onLoginSuccess }: PasswordLoginScreenProps) => {
  const { t, lang, setLang } = useLanguage();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!isValidFourDigitPassword(password)) {
      toast.error("Password must be exactly 4 digits");
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(phone, password);
      onLoginSuccess(result.user, result.token);
    } catch (err: any) {
      toast.error(err?.message || t("adminLoginFailedToast"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "linear-gradient(160deg, #f1f8e9 0%, #e8f5e9 50%, #f9fbe7 100%)" }}>
      <div className="relative agri-header-gradient px-5 pt-12 pb-8 flex flex-col">
        <div className="flex justify-between items-start">
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/80 hover:text-white mb-5 w-fit">
            <ArrowLeft size={18} /> <span className="text-sm font-medium">{t("back")}</span>
          </button>
          <button
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            className="text-xs font-bold border border-white/30 rounded-lg px-2.5 py-1 text-white/80 hover:text-white hover:border-white/60 bg-white/10"
          >
            {lang === "ta" ? "EN" : "தமிழ்"}
          </button>
        </div>
        <h1 className="text-xl font-bold text-white">Login</h1>
        <p className="text-sm text-white/75 mt-1">Continue with {phone}</p>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-4">
          <div>
            <Label className="text-sm font-semibold text-foreground mb-2 block">{t("password")}</Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="tap-target text-base border-2 focus:border-primary rounded-xl pr-10"
                placeholder={t("passwordPlaceholder")}
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading || !isValidFourDigitPassword(password)}
            className="tap-target w-full text-base font-bold rounded-xl shadow-sm disabled:opacity-40"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : t("login") + " →"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PasswordLoginScreen;
