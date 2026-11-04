import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

const CrpApproveFarmersTab = () => {
  const { t } = useLanguage();
  const [farmers, setFarmers] = useState<any[]>([]);

  useEffect(() => {
    api.getPendingFarmers().then((data) => {
      // backend returns all farmers; filter unapproved
      const pending = data.filter ? data.filter((f: any) => !f.approved) : data;
      setFarmers(pending);
    }).catch(() => {});
  }, []);

  const pendingFarmers = farmers;

  const handle = async (id: string, action: "approved" | "rejected") => {
    try {
      if (action === "approved") await api.approveFarmer(id);
      else await api.rejectFarmer(id);
      setFarmers((prev) => prev.filter((f) => f._id !== id));
      toast.success(action === "approved" ? "✅ விவசாயி அனுமதிக்கப்பட்டார்" : "❌ விவசாயி நிராகரிக்கப்பட்டார்");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("addNewMembers")}</h2>
        <Badge className="bg-warning text-warning-foreground">{pendingFarmers.length} நிலுவை</Badge>
      </div>

      {pendingFarmers.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">நிலுவையில் உள்ள விண்ணப்பங்கள் இல்லை</p>
        </Card>
      )}

      {pendingFarmers.map((f) => (
        <Card key={f._id} className="p-4 bg-card flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{f.name}</p>
            <p className="text-xs text-muted-foreground">{f.phone}</p>
            <p className="text-xs text-muted-foreground">{f.hamlet}</p>
            <p className="text-xs text-muted-foreground">{f.shg_name}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" onClick={() => handle(f._id, "approved")} className="bg-success text-success-foreground gap-1">
              <Check size={14} /> அனுமதி
            </Button>
            <Button size="sm" onClick={() => handle(f._id, "rejected")} variant="outline" className="border-danger text-danger gap-1">
              <X size={14} /> நிராகரி
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CrpApproveFarmersTab;
