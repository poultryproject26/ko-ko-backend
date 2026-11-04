import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/mockData";
import { api } from "@/lib/api";
import {
  formatVaccinationCalendarDate,
  formatVaccinationSubmissionDate,
  getVaccinationStockDueDate,
} from "@/lib/vaccinationDates";
import { toast } from "sonner";
import { IndianRupee, ChevronDown, ChevronUp, Syringe, CheckCircle2 } from "lucide-react";
import { User } from "@/lib/auth";

const CrpServicesTab = ({ user }: { user: User }) => {
  const { t } = useLanguage();

  const [allDemands, setAllDemands] = useState<any[]>([]);
  const [allDiseaseReports, setAllDiseaseReports] = useState<any[]>([]);
  const [allVaxStocks, setAllVaxStocks] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api.getAllServiceDemands().then(setAllDemands).catch(() => {});
    api.getAllDiseaseReports().then(setAllDiseaseReports).catch(() => {});
    api.getAllVaccinationStock().then(setAllVaxStocks).catch(() => {});
  }, [refresh]);

  const pendingDemands  = allDemands.filter((d) => d.status === "Pending" && ["Feed Stock", "Equipment", "Vaccination", "Deworming"].includes(d.type));
  const doneDemands     = allDemands.filter((d) => d.status !== "Pending" && ["Feed Stock", "Equipment", "Vaccination", "Deworming"].includes(d.type));
  const pendingLoans    = allDemands.filter((d) => d.type === "Loan" && d.status === "Pending");
  const doneLoans       = allDemands.filter((d) => d.type === "Loan" && d.status !== "Pending");
  const pendingDisease  = allDiseaseReports.filter((r) => r.status === "Pending");
  const reviewedDisease = allDiseaseReports.filter((r) => r.status === "Reviewed");

  const [serviceTab, setServiceTab] = useState<"pending" | "history">("pending");
  const [loanTab,    setLoanTab]    = useState<"pending" | "history">("pending");
  const [diseaseTab, setDiseaseTab] = useState<"pending" | "reviewed">("pending");
  const [serviceOpen, setServiceOpen] = useState(true);
  const [loanOpen,    setLoanOpen]    = useState(true);
  const [diseaseOpen, setDiseaseOpen] = useState(true);
  const [vaxStockOpen, setVaxStockOpen] = useState(true);

  const pendingVaxStocks = allVaxStocks.filter((s) => s.status !== "completed");
  const doneVaxStocks    = allVaxStocks.filter((s) => s.status === "completed");
  const [vaxStockTab, setVaxStockTab] = useState<"pending" | "history">("pending");

  const handleCompleteVaxStock = async (id: string) => {
    try {
      await api.completeVaccinationStock(id);
      setRefresh((k) => k + 1);
      toast.success("தடுப்பூசி நிறைவு செய்யப்பட்டது ✅");
    } catch {
      toast.error("Failed");
    }
  };

  const handleApprove = async (id: string) => {
    try { await api.completeServiceDemand(id); setRefresh((k) => k + 1); toast.success("அனுமதிக்கப்பட்டது ✅"); }
    catch { toast.error("Failed"); }
  };
  const handleReject = async (id: string) => {
    try { await api.rejectServiceDemand(id); setRefresh((k) => k + 1); toast.success("நிராகரிக்கப்பட்டது ❌"); }
    catch { toast.error("Failed"); }
  };
  const handleReviewDisease = async (id: string) => {
    try { await api.reviewDiseaseReport(id); setRefresh((k) => k + 1); toast.success("பரிசீலிக்கப்பட்டது ✅"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Vaccination Stock Requests */}
      <Card className="p-5 bg-card border-2 border-teal-200">
        <button className="w-full flex items-center justify-between" onClick={() => setVaxStockOpen((o) => !o)}>
          <div className="flex items-center gap-2">
            <Syringe size={20} className="text-teal-700" />
            <h2 className="text-lg font-bold text-foreground">{t("vaccinationStockRequests")}</h2>
          </div>
          {vaxStockOpen ? <ChevronUp size={18} className="text-muted-foreground shrink-0" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0" />}
        </button>
        {vaxStockOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setVaxStockTab("pending")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${vaxStockTab === "pending" ? "bg-warning text-warning-foreground border-warning" : "border-border text-muted-foreground"}`}>
                நிலுவை ({pendingVaxStocks.length})
              </button>
              <button onClick={() => setVaxStockTab("history")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${vaxStockTab === "history" ? "bg-success text-success-foreground border-success" : "border-border text-muted-foreground"}`}>
                முடிந்தவை ({doneVaxStocks.length})
              </button>
            </div>

            {vaxStockTab === "pending" && (
              pendingVaxStocks.length === 0
                ? <p className="text-sm text-muted-foreground">நிலுவை கோரிக்கைகள் இல்லை</p>
                : <div className="flex flex-col gap-3">
                    {pendingVaxStocks.map((s: any) => (
                      <div key={s._id} className="border border-teal-200 rounded-xl p-4 bg-teal-50/40">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{s.userId?.name || s.farmerName || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("village")}: {s.userId?.hamletId?.nameTa || s.userId?.hamletId?.name || s.userId?.hamlet || s.hamlet || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">{t("phoneNumber")}: {s.userId?.phone || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("vaccinationRequestSubmitted")}: {formatVaccinationSubmissionDate(s.entryDate)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("vaccinationRequestDeadline")}: {formatVaccinationCalendarDate(getVaccinationStockDueDate(s))}
                            </p>
                          </div>
                          <Badge className="bg-warning text-warning-foreground shrink-0">{t("pending")}</Badge>
                        </div>

                        <div className="bg-white rounded-lg border border-teal-100 p-3 mb-3 flex flex-col gap-1.5">
                          {s.withinMonth > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-foreground">1 மாதத்திற்குள் <span className="text-primary font-semibold">(LaSota)</span></span>
                              <span className="font-bold text-foreground">{s.withinMonth} கோழிகள்</span>
                            </div>
                          )}
                          {s.month2 > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-foreground">2 மாத வயது <span className="text-primary font-semibold">(Fowl Pox)</span></span>
                              <span className="font-bold text-foreground">{s.month2} கோழிகள்</span>
                            </div>
                          )}
                          {s.month3 > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-foreground">3 மாத வயது <span className="text-primary font-semibold">(Infectious Coryza)</span></span>
                              <span className="font-bold text-foreground">{s.month3} கோழிகள்</span>
                            </div>
                          )}
                          {s.month4Plus > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-foreground">4–7 மாதங்கள் மேல் <span className="text-primary font-semibold">(RDVK + Deworming)</span></span>
                              <span className="font-bold text-foreground">{s.month4Plus} கோழிகள்</span>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleCompleteVaxStock(s._id)}
                          className="w-full bg-success text-success-foreground gap-1"
                        >
                          <CheckCircle2 size={15} /> {t("vaccinationAdministeredButton")} ✅
                        </Button>
                      </div>
                    ))}
                  </div>
            )}

            {vaxStockTab === "history" && (
              doneVaxStocks.length === 0
                ? <p className="text-sm text-muted-foreground">இன்னும் எதுவும் இல்லை</p>
                : <div className="flex flex-col gap-3">
                    {doneVaxStocks.map((s: any) => (
                      <div key={s._id} className="border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{s.userId?.name || s.farmerName || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("village")}: {s.userId?.hamletId?.nameTa || s.userId?.hamletId?.name || s.userId?.hamlet || s.hamlet || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">{t("phoneNumber")}: {s.userId?.phone || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("vaccinationRequestSubmitted")}: {formatVaccinationSubmissionDate(s.entryDate)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("vaccinationRequestDeadline")}: {formatVaccinationCalendarDate(getVaccinationStockDueDate(s))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("vaccinationCompletedAt")}: {formatVaccinationSubmissionDate(s.completedAt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("vaccinationCompletedBy")}: {s.completedBy || "—"}
                            </p>
                          </div>
                          <Badge className="bg-success text-success-foreground shrink-0">{t("completed")}</Badge>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 flex flex-col gap-1">
                          {s.withinMonth > 0 && <p className="text-xs text-foreground">1 மாதத்திற்குள் (LaSota): <span className="font-bold">{s.withinMonth}</span></p>}
                          {s.month2 > 0 && <p className="text-xs text-foreground">2 மாத வயது (Fowl Pox): <span className="font-bold">{s.month2}</span></p>}
                          {s.month3 > 0 && <p className="text-xs text-foreground">3 மாத வயது (Infectious Coryza): <span className="font-bold">{s.month3}</span></p>}
                          {s.month4Plus > 0 && <p className="text-xs text-foreground">4–7 மாதங்கள் மேல் (RDVK + Deworming): <span className="font-bold">{s.month4Plus}</span></p>}
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        )}
      </Card>

      {/* Service Demands */}
      <Card className="p-5 bg-card">
        <button className="w-full flex items-center justify-between" onClick={() => setServiceOpen((o) => !o)}>
          <h2 className="text-lg font-bold text-foreground">விவசாயி கோரிக்கைகள் (Feed / Equipment)</h2>
          {serviceOpen ? <ChevronUp size={18} className="text-muted-foreground shrink-0" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0" />}
        </button>
        {serviceOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setServiceTab("pending")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${serviceTab === "pending" ? "bg-warning text-warning-foreground border-warning" : "border-border text-muted-foreground"}`}>
                நிலுவை ({pendingDemands.length})
              </button>
              <button onClick={() => setServiceTab("history")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${serviceTab === "history" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                வரலாறு ({doneDemands.length})
              </button>
            </div>
            {serviceTab === "pending" && (
              pendingDemands.length === 0 ? <p className="text-sm text-muted-foreground">நிலுவை கோரிக்கைகள் இல்லை</p> :
              <div className="flex flex-col gap-3">
                {pendingDemands.map((d) => (
                  <div key={d._id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{d.userId?.name || d.farmerName}</p>
                        <p className="text-xs text-muted-foreground">{d.userId?.hamlet || d.hamlet} • {formatDate(d.createdAt)}</p>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">{d.type}</Badge>
                    </div>
                    {d.option && <p className="text-xs font-semibold text-primary mb-0.5">{d.option}</p>}
                    <p className="text-xs text-muted-foreground mb-3">Qty: {d.quantity}{d.notes ? ` • ${d.notes}` : ""}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(d._id)} className="flex-1 bg-success text-success-foreground text-xs">✅ அனுமதி</Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(d._id)} className="flex-1 border-danger text-danger text-xs">❌ நிராகரி</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {serviceTab === "history" && (
              doneDemands.length === 0 ? <p className="text-sm text-muted-foreground">இன்னும் எதுவும் இல்லை</p> :
              <div className="flex flex-col gap-3">
                {doneDemands.map((d) => (
                  <div key={d._id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-bold text-foreground">{d.userId?.name || d.farmerName}</p>
                        <p className="text-xs text-muted-foreground">{d.userId?.hamlet || d.hamlet} • {formatDate(d.createdAt)}</p>
                      </div>
                      <Badge className={d.status === "Completed" ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground"}>
                        {d.status === "Completed" ? "✅ அனுமதி" : "❌ நிராகரிக்கப்பட்டது"}
                      </Badge>
                    </div>
                    {d.option && <p className="text-xs font-semibold text-primary mb-0.5">{d.option}</p>}
                    <p className="text-xs text-muted-foreground">Qty: {d.quantity}{d.notes ? ` • ${d.notes}` : ""}</p>
                    {d.actionBy && <p className="text-xs text-muted-foreground mt-0.5">செயல்: {d.actionBy}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Loan Demands */}
      <Card className="p-5 bg-card border-2 border-warning/40">
        <button className="w-full flex items-center justify-between" onClick={() => setLoanOpen((o) => !o)}>
          <div className="flex items-center gap-2">
            <IndianRupee size={20} className="text-warning" />
            <h2 className="text-lg font-bold text-foreground">கடன் கோரிக்கைகள் (Credit / Loan Demands)</h2>
          </div>
          {loanOpen ? <ChevronUp size={18} className="text-muted-foreground shrink-0" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0" />}
        </button>
        {loanOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setLoanTab("pending")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${loanTab === "pending" ? "bg-warning text-warning-foreground border-warning" : "border-border text-muted-foreground"}`}>
                நிலுவை ({pendingLoans.length})
              </button>
              <button onClick={() => setLoanTab("history")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${loanTab === "history" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                வரலாறு ({doneLoans.length})
              </button>
            </div>
            {loanTab === "pending" && (
              pendingLoans.length === 0 ? <p className="text-sm text-muted-foreground">நிலுவை கடன் கோரிக்கைகள் இல்லை</p> :
              <div className="flex flex-col gap-3">
                {pendingLoans.map((d: any) => (
                  <div key={d._id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{d.userId?.name || d.farmerName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{d.userId?.hamlet || d.hamlet || ""} • {formatDate(d.createdAt)}</p>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">நிலுவை</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold text-warning">₹{(d.amount || 0).toLocaleString("ta-IN")}</p>
                        {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(d._id)} className="bg-success text-success-foreground text-xs">அனுமதி</Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(d._id)} className="border-danger text-danger text-xs">நிராகரி</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {loanTab === "history" && (
              doneLoans.length === 0 ? <p className="text-sm text-muted-foreground">இன்னும் எதுவும் இல்லை</p> :
              <div className="flex flex-col gap-3">
                {doneLoans.map((d: any) => (
                  <div key={d._id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{d.userId?.name || d.farmerName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{d.userId?.hamlet || d.hamlet || ""} • {formatDate(d.createdAt)}</p>
                      </div>
                      <Badge className={d.status === "Completed" ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground"}>
                        {d.status === "Completed" ? "✅ அனுமதிக்கப்பட்டது" : "❌ நிராகரிக்கப்பட்டது"}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-foreground">₹{(d.amount || 0).toLocaleString("ta-IN")}</p>
                    {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
                    {d.actionBy && <p className="text-xs text-muted-foreground mt-0.5">செயல்: {d.actionBy}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Disease Reports */}
      <Card className="p-5 bg-card border-2 border-danger/30">
        <button className="w-full flex items-center justify-between" onClick={() => setDiseaseOpen((o) => !o)}>
          <h2 className="text-lg font-bold text-foreground">நோய் அறிக்கைகள்</h2>
          {diseaseOpen ? <ChevronUp size={18} className="text-muted-foreground shrink-0" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0" />}
        </button>
        {diseaseOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setDiseaseTab("pending")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${diseaseTab === "pending" ? "bg-warning text-warning-foreground border-warning" : "border-border text-muted-foreground"}`}>
                நிலுவை ({pendingDisease.length})
              </button>
              <button onClick={() => setDiseaseTab("reviewed")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${diseaseTab === "reviewed" ? "bg-success text-success-foreground border-success" : "border-border text-muted-foreground"}`}>
                பரிசீலிக்கப்பட்டது ({reviewedDisease.length})
              </button>
            </div>
            {diseaseTab === "pending" && (
              pendingDisease.length === 0 ? <p className="text-sm text-muted-foreground">நிலுவை நோய் அறிக்கைகள் இல்லை</p> :
              <div className="flex flex-col gap-3">
                {pendingDisease.map((r: any) => (
                  <div key={r._id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{r.farmerName || r.userId?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.reportedAt)}</p>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">நிலுவை</Badge>
                    </div>
                    <p className="text-sm text-foreground mb-3">{r.description}</p>
                    <Button size="sm" onClick={() => handleReviewDisease(r._id)} className="w-full bg-success text-success-foreground text-xs">
                      ✅ பரிசீலிக்கப்பட்டது
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {diseaseTab === "reviewed" && (
              reviewedDisease.length === 0 ? <p className="text-sm text-muted-foreground">இன்னும் எதுவும் இல்லை</p> :
              <div className="flex flex-col gap-3">
                {reviewedDisease.map((r: any) => (
                  <div key={r._id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-bold text-foreground">{r.farmerName || r.userId?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.reportedAt)}</p>
                      </div>
                      <Badge className="bg-success text-success-foreground">✅ பரிசீலிக்கப்பட்டது</Badge>
                    </div>
                    <p className="text-sm text-foreground">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

    </div>
  );
};

export default CrpServicesTab;
