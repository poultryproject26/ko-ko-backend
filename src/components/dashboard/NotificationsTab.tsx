import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/mockData";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Bell, AlertTriangle, TrendingUp, Lightbulb, Volume2, VolumeX, Square, Syringe, CheckCircle2, Megaphone } from "lucide-react";
import { User } from "@/lib/auth";

const useSpeech = () => {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      TextToSpeech.stop().catch(() => {});
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakWeb = (id: string, text: string) => {
    window.speechSynthesis.cancel();
    if (speakingId === id) { setSpeakingId(null); return; }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ta-IN";
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const tamilVoice = voices.find((v) => v.lang.startsWith("ta"));
      if (tamilVoice) utterance.voice = tamilVoice;
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    };

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoiceAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  };

  const speakNative = async (id: string, text: string) => {
    try {
      await TextToSpeech.speak({ text, lang: "ta-IN", rate: 1.0 });
      setSpeakingId(id);
    } catch (error) {
      console.warn("Native TTS failed, falling back to web TTS", error);
      speakWeb(id, text);
    }
  };

  const speak = async (id: string, text: string) => {
    if (typeof window === "undefined") return;
    if (window.navigator?.userAgent?.includes("Android") || window.navigator?.userAgent?.includes("iPhone")) {
      await speakNative(id, text);
      return;
    }
    speakWeb(id, text);
  };

  const stop = async () => {
    await TextToSpeech.stop().catch(() => {});
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
  };

  return { speakingId, speak, stop };
};

const NotificationsTab = ({ user }: { user: User }) => {
  const { t, lang, setLang } = useLanguage();
  const { speakingId, speak, stop } = useSpeech();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"unread" | "read">("unread");

  const { data: unread = [], isLoading: loadingUnread } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.getNotifications(false),
    staleTime: 30_000,
  });

  const { data: read = [], isLoading: loadingRead } = useQuery({
    queryKey: ["notifications", "read"],
    queryFn: () => api.getNotifications(true),
    staleTime: 30_000,
    enabled: activeTab === "read",
  });

  // When switching away from unread tab, mark all as read and refresh read tab
  useEffect(() => {
    if (activeTab === "read" && (unread as any[]).length > 0) {
      api.markAllNotificationsRead().then(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
        queryClient.invalidateQueries({ queryKey: ["notifications", "read"] });
      }).catch(() => {});
    }
  }, [activeTab]);

  const notifications = (activeTab === "unread" ? unread : read) as any[];
  const isLoading = activeTab === "unread" ? loadingUnread : loadingRead;

  const typeConfig: Record<string, { label: string; className: string; icon: typeof Bell; iconColor: string; bg: string }> = {
    disease:                 { label: t("diseaseAlert"),       className: "bg-danger text-danger-foreground",   icon: AlertTriangle, iconColor: "text-danger",       bg: "bg-danger/8" },
    market:                  { label: t("marketPrice"),        className: "bg-success text-success-foreground", icon: TrendingUp,    iconColor: "text-success",      bg: "bg-success/8" },
    tip:                     { label: t("farmingTip"),         className: "bg-primary text-primary-foreground", icon: Lightbulb,     iconColor: "text-primary",      bg: "bg-primary/8" },
    vaccination_reminder:    { label: lang === "ta" ? "தடுப்பூசி நினைவூட்டல்" : "Vaccination Reminder", className: "bg-warning text-warning-foreground", icon: Syringe, iconColor: "text-warning", bg: "bg-warning/8" },
    vaccination_stock_reminder: { label: lang === "ta" ? "கோழிகளுக்கான தடுப்பூசி தேவை நினைவூட்டல்" : "Vaccination Requirement Reminder", className: "bg-warning text-warning-foreground", icon: Syringe, iconColor: "text-warning", bg: "bg-warning/8" },
    r2b_reminder:            { label: "R2B Reminder",           className: "bg-warning text-warning-foreground", icon: Syringe, iconColor: "text-warning", bg: "bg-warning/8" },
    deworming_reminder:      { label: "Deworming Reminder",      className: "bg-warning text-warning-foreground", icon: Syringe, iconColor: "text-warning", bg: "bg-warning/8" },
    booster_reminder:        { label: "Booster Reminder",        className: "bg-warning text-warning-foreground", icon: Syringe, iconColor: "text-warning", bg: "bg-warning/8" },
    vaccination_completed:   { label: "Vaccination Completed",   className: "bg-success text-success-foreground", icon: CheckCircle2, iconColor: "text-success", bg: "bg-success/8" },
    vaccination_missed:      { label: "Vaccination Missed",      className: "bg-danger text-danger-foreground", icon: AlertTriangle, iconColor: "text-danger", bg: "bg-danger/8" },
    vaccination_rescheduled: { label: "Vaccination Rescheduled", className: "bg-primary text-primary-foreground", icon: Syringe, iconColor: "text-primary", bg: "bg-primary/8" },
    mortality_alert:         { label: "Mortality Alert",         className: "bg-danger text-danger-foreground", icon: AlertTriangle, iconColor: "text-danger", bg: "bg-danger/8" },
    vaccine_overdue:         { label: "Vaccine Overdue",         className: "bg-danger text-danger-foreground", icon: AlertTriangle, iconColor: "text-danger", bg: "bg-danger/8" },
    user_registration_pending: { label: "Registration Pending",   className: "bg-primary text-primary-foreground", icon: Bell, iconColor: "text-primary", bg: "bg-primary/8" },
    user_approved:           { label: "User Approved",           className: "bg-success text-success-foreground", icon: CheckCircle2, iconColor: "text-success", bg: "bg-success/8" },
    user_rejected:           { label: "User Rejected",           className: "bg-danger text-danger-foreground", icon: AlertTriangle, iconColor: "text-danger", bg: "bg-danger/8" },
    approval_reminder:       { label: "Approval Reminder",       className: "bg-primary text-primary-foreground", icon: Bell, iconColor: "text-primary", bg: "bg-primary/8" },
    loan_applied:            { label: "Loan Applied",            className: "bg-primary text-primary-foreground", icon: TrendingUp, iconColor: "text-primary", bg: "bg-primary/8" },
    loan_approved:           { label: "Loan Approved",           className: "bg-success text-success-foreground", icon: CheckCircle2, iconColor: "text-success", bg: "bg-success/8" },
    loan_rejected:           { label: "Loan Rejected",           className: "bg-danger text-danger-foreground", icon: AlertTriangle, iconColor: "text-danger", bg: "bg-danger/8" },
    loan_due_reminder:       { label: "Loan Due Reminder",       className: "bg-warning text-warning-foreground", icon: Bell, iconColor: "text-warning", bg: "bg-warning/8" },
    loan_disbursed:          { label: "Loan Disbursed",          className: "bg-success text-success-foreground", icon: TrendingUp, iconColor: "text-success", bg: "bg-success/8" },
    admin_announcement:      { label: t("announcementLabel"),    className: "bg-primary text-primary-foreground", icon: Megaphone, iconColor: "text-primary", bg: "bg-primary/8" },
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-border/60 p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  const isSpeaking = speakingId !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-border">
        <button
          onClick={() => setActiveTab("unread")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${
            activeTab === "unread" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          {lang === "ta" ? "படிக்காதவை" : "Unread"}
          {(unread as any[]).length > 0 && (
            <span className="ml-1.5 bg-danger text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
              {(unread as any[]).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("read")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "read" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          {lang === "ta" ? "படித்தவை" : "Read"}
          <span className="ml-1 text-xs opacity-70">(30 {lang === "ta" ? "நாள்" : "days"})</span>
        </button>
      </div>

      {isSpeaking && (
        <button
          onClick={stop}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-danger/10 border border-danger/30 rounded-xl text-sm font-semibold text-danger"
        >
          <Square size={14} fill="currentColor" /> நிறுத்து (Stop)
        </button>
      )}

      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-3">
            <Bell size={28} className="text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {activeTab === "unread"
              ? (lang === "ta" ? "படிக்காத அறிவிப்புகள் இல்லை" : "No unread notifications")
              : (lang === "ta" ? "கடந்த 30 நாளில் படித்த அறிவிப்புகள் இல்லை" : "No read notifications in past 30 days")}
          </p>
        </div>
      )}

      {notifications.map((n: any) => {
        const config = typeConfig[n.type] ?? { label: n.type, className: "bg-muted text-foreground", icon: Bell, iconColor: "text-muted-foreground", bg: "bg-muted/20" };
        const Icon = config.icon;
        const isThisSpeaking = speakingId === n._id;

        return (
          <div key={n._id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${isThisSpeaking ? "border-primary/40 bg-primary/5" : "border-border/60"}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={18} className={config.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge className={`${config.className} text-xs`}>{config.label}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(n.createdAt)}</span>
                </div>
                <div className="text-sm text-foreground leading-relaxed flex flex-col gap-1">
                  {n.message.split("\n").map((line: string, i: number) =>
                    line.trim() === "" ? null : (
                      <span key={i} className="block break-words">{line}</span>
                    )
                  )}
                </div>
                <button
                  onClick={() => speak(n._id, n.message)}
                  className={`mt-2.5 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    isThisSpeaking
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {isThisSpeaking ? (
                    <><VolumeX size={13} /> நிறுத்து</>
                  ) : (
                    <><Volume2 size={13} /> கேட்க</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationsTab;
