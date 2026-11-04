import { useState } from "react";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { isValidFourDigitPassword } from "@/lib/authValidation";
import { useLanguage } from "@/i18n/LanguageContext";

// Strips non-digits and caps at 4 characters, preserving leading zeros.
function sanitizePin(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

// Defined at module scope so its identity never changes between renders.
// If it were defined inside ChangePinCard, React would see a new component
// type on every state update, unmount the old input, and mount a fresh one —
// destroying focus after each keystroke.
interface PinFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  disabled: boolean;
}

const PinField = ({ id, label, value, onChange, show, onToggleShow, disabled }: PinFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id} className="text-sm font-semibold">
      {label}
    </Label>
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(sanitizePin(e.target.value))}
        type={show ? "text" : "password"}
        inputMode="numeric"
        placeholder="••••"
        className="tap-target border-2 focus:border-primary rounded-xl pr-10 text-base tracking-widest"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-label={show ? "Hide PIN" : "Show PIN"}
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const ChangePinCard = () => {
  const { lang } = useLanguage();
  const ta = lang === "ta";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    !loading &&
    isValidFourDigitPassword(current) &&
    isValidFourDigitPassword(next) &&
    isValidFourDigitPassword(confirm);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (next !== confirm) {
      toast.error(ta ? "புதிய PIN பொருந்தவில்லை" : "New PINs do not match");
      return;
    }
    if (next === current) {
      toast.error(ta ? "புதிய PIN தற்போதைய PIN-ஐ விட வேறுபட வேண்டும்" : "New PIN must differ from the current PIN");
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(current, next);
      toast.success(ta ? "PIN வெற்றிகரமாக மாற்றப்பட்டது ✅" : "PIN changed successfully ✅");
      // Clear all fields after success — never leave PIN values in state.
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      toast.error(err?.message || (ta ? "PIN மாற்ற முடியவில்லை" : "Failed to change PIN"));
    } finally {
      setLoading(false);
    }
  };

  const toggleShow = () => setShow((v) => !v);

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <KeyRound size={15} className="text-primary" />
        </div>
        <p className="text-sm font-bold text-foreground">
          {ta ? "PIN மாற்று" : "Change PIN"}
        </p>
      </div>

      <PinField
        id="cp-current"
        label={ta ? "தற்போதைய PIN" : "Current PIN"}
        value={current}
        onChange={setCurrent}
        show={show}
        onToggleShow={toggleShow}
        disabled={loading}
      />
      <PinField
        id="cp-new"
        label={ta ? "புதிய PIN" : "New PIN"}
        value={next}
        onChange={setNext}
        show={show}
        onToggleShow={toggleShow}
        disabled={loading}
      />
      <PinField
        id="cp-confirm"
        label={ta ? "புதிய PIN உறுதிப்படுத்தவும்" : "Confirm New PIN"}
        value={confirm}
        onChange={setConfirm}
        show={show}
        onToggleShow={toggleShow}
        disabled={loading}
      />

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl font-bold tap-target disabled:opacity-40"
        style={{ background: canSubmit ? "linear-gradient(135deg, #2E7D32, #4CAF50)" : undefined }}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          ta ? "PIN மாற்று →" : "Change PIN →"
        )}
      </Button>
    </div>
  );
};

export default ChangePinCard;
