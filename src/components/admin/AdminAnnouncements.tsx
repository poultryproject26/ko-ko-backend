import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { api, AdminAnnouncementAudience } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, Users, UserCog, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TITLE_MAX_LENGTH = 120;
const MESSAGE_MAX_LENGTH = 1000;

const AdminAnnouncements = () => {
  const { t } = useLanguage();
  const [audience, setAudience] = useState<AdminAnnouncementAudience>("both");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const trimmedMessage = message.trim();
  const canSend = trimmedMessage.length > 0 && trimmedMessage.length <= MESSAGE_MAX_LENGTH && !sending;

  const audienceOptions: { key: AdminAnnouncementAudience; label: string; icon: LucideIcon }[] = [
    { key: "crp", label: t("audienceAllCrps"), icon: UserCog },
    { key: "farmer", label: t("audienceAllFarmers"), icon: Users },
    { key: "both", label: t("audienceBoth"), icon: Megaphone },
  ];
  const audienceLabel = audienceOptions.find((o) => o.key === audience)?.label || audience;

  const handleSend = async () => {
    if (!trimmedMessage) {
      toast.error(t("announcementMessageRequiredToast"));
      return;
    }
    setSending(true);
    setConfirmOpen(false);
    try {
      const result = await api.sendAdminAnnouncement(title.trim() || undefined, trimmedMessage, audience);
      if (result.status === "no_recipients") {
        toast.error(t("announcementNoRecipientsToast"));
      } else if (result.status === "duplicate_suppressed") {
        toast.error(t("announcementDuplicateToast"));
      } else {
        toast.success(t("announcementSentToast").replace("{count}", String(result.recipientCount)));
        setTitle("");
        setMessage("");
      }
    } catch (err: any) {
      toast.error(err?.message || t("announcementFailedToast"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("adminAnnouncements")}</h2>
      </div>

      <Card className="p-4 sm:p-6 flex flex-col gap-5 border-border/60">
        <div>
          <Label className="mb-2 block">{t("announcementAudienceLabel")}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {audienceOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setAudience(o.key)}
                disabled={sending}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  audience === o.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <o.icon size={16} /> {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>{t("announcementTitleLabel")}</Label>
            <span className="text-xs text-muted-foreground">
              {t("charactersRemainingLabel").replace("{count}", String(TITLE_MAX_LENGTH - title.length))}
            </span>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
            placeholder={t("announcementTitlePlaceholder")}
            disabled={sending}
            maxLength={TITLE_MAX_LENGTH}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>{t("announcementMessageLabel")}</Label>
            <span className="text-xs text-muted-foreground">
              {t("charactersRemainingLabel").replace("{count}", String(MESSAGE_MAX_LENGTH - message.length))}
            </span>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
            placeholder={t("announcementMessagePlaceholder")}
            disabled={sending}
            rows={5}
            maxLength={MESSAGE_MAX_LENGTH}
            className="resize-none"
          />
        </div>

        <Button onClick={() => setConfirmOpen(true)} disabled={!canSend} className="gap-2">
          {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          {sending ? t("announcementSending") : t("announcementSendButton")}
        </Button>
      </Card>

      {/* Confirmation — required before every send, to prevent accidental broadcasts. */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !sending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("announcementConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("announcementConfirmDescription").replace("{audience}", audienceLabel)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSend(); }} disabled={sending}>
              {sending ? <Loader2 className="animate-spin" size={16} /> : t("announcementSendButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAnnouncements;
