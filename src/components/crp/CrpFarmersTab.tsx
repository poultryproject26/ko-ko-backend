import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/mockData";
import { useHamlets, hamletDisplayName } from "@/hooks/use-hamlets";
import { ArrowLeft, Search, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const CrpFarmersTab = () => {
  const { t, lang } = useLanguage();
  const { hamlets, hamletsLoading } = useHamlets();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<"farmers" | "shg">("farmers");
  const [search, setSearch] = useState("");
  const [hamletFilter, setHamletFilter] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<any | null>(null);
  const [farmerDetails, setFarmerDetails] = useState<{ birdUpdates: any[]; vaccinations: any[]; demands: any[]; disease: any[] }>({ birdUpdates: [], vaccinations: [], demands: [], disease: [] });
  const [page, setPage] = useState(0);
  const [shgGroups, setShgGroups] = useState<any[]>([]);
  const [newShgName, setNewShgName] = useState("");
  const [shgToDelete, setShgToDelete] = useState<any | null>(null);
  const [farmerToDelete, setFarmerToDelete] = useState(false);
  const perPage = 10;

  const { data: farmers = [], refetch: refetchFarmers } = useQuery({
    queryKey: ["crpFarmers"],
    queryFn: () => api.getFarmers(),
    staleTime: 60_000,
  });

  useEffect(() => {
    api.getShgGroups().then(setShgGroups).catch(() => {});
  }, [subTab]);

  const handleSelectFarmer = async (f: any) => {
    setSelectedFarmer(f);
    try {
      const [allBirds, allVax, allDemands, allDisease] = await Promise.all([
        api.getAllBirdUpdates(),
        api.getAllVaccinations(),
        api.getAllServiceDemands(),
        api.getAllDiseaseReports(),
      ]);
      setFarmerDetails({
        birdUpdates: allBirds.filter((u: any) => (u.userId?._id || u.userId) === f._id),
        vaccinations: allVax.filter((v: any) => (v.userId?._id || v.userId) === f._id),
        demands: allDemands.filter((d: any) => (d.userId?._id || d.userId) === f._id),
        disease: allDisease.filter((r: any) => (r.userId?._id || r.userId) === f._id),
      });
    } catch { /* show empty */ }
  };

  const confirmDeleteFarmer = async () => {
    try {
      await api.deleteFarmer(selectedFarmer._id);
      queryClient.invalidateQueries({ queryKey: ["crpFarmers"] });
      toast.success("✅ விவசாயி நீக்கப்பட்டார்");
      setSelectedFarmer(null);
      setFarmerToDelete(false);
    } catch (err: any) {
      toast.error(err?.message || "நீக்க முடியவில்லை");
      setFarmerToDelete(false);
    }
  };

  const handleAddShg = async () => {
    if (!newShgName.trim()) { toast.error("SHG குழு பெயரை உள்ளிடவும்"); return; }
    try {
      const group = await api.addShgGroup(newShgName.trim());
      setShgGroups((prev) => [...prev, group]);
      setNewShgName("");
      toast.success("✅ SHG குழு சேர்க்கப்பட்டது");
    } catch (err: any) {
      toast.error(err?.message || "சேர்க்க முடியவில்லை");
    }
  };

  const confirmDeleteShg = async () => {
    if (!shgToDelete) return;
    try {
      const result = await api.deleteShgGroup(shgToDelete._id);
      setShgGroups((prev) => prev.filter((g: any) => g._id !== shgToDelete._id));
      toast.success(`✅ SHG குழு நீக்கப்பட்டது (${result.deletedFarmers} விவசாயிகள் நீக்கப்பட்டனர்)`);
    } catch (err: any) {
      toast.error(err?.message || "நீக்க முடியவில்லை");
    }
    setShgToDelete(null);
  };

  // ── SHG sub-tab ──────────────────────────────────────────────────────────────
  if (subTab === "shg") {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => setSubTab("farmers")} className="text-sm font-medium text-primary underline self-start">{t("back")}</button>
        <h2 className="text-lg font-bold text-foreground">SHG குழுக்களை நிர்வகி</h2>
        <Card className="p-4 bg-card">
          <Label className="text-sm font-medium mb-2 block">புதிய SHG குழு சேர்க்க</Label>
          <div className="flex gap-2">
            <Input value={newShgName} onChange={(e) => setNewShgName(e.target.value)} placeholder="SHG குழு பெயர்" className="flex-1" onKeyDown={(e) => e.key === "Enter" && handleAddShg()} />
            <Button onClick={handleAddShg} className="gap-1"><Plus size={16} /> சேர்</Button>
          </div>
        </Card>
        <p className="text-sm text-muted-foreground">மொத்தம்: {shgGroups.length} குழுக்கள்</p>
        {shgGroups.map((shg) => (
          <Card key={shg._id} className="p-3 bg-card flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">{shg.name}</span>
            <Button size="sm" variant="outline" onClick={() => setShgToDelete(shg)} className="border-danger text-danger gap-1 shrink-0">
              <Trash2 size={14} /> நீக்கு
            </Button>
          </Card>
        ))}
        {shgToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="p-6 bg-card max-w-sm w-full">
              <h3 className="text-lg font-bold text-foreground mb-3">⚠️ எச்சரிக்கை</h3>
              <p className="text-sm text-foreground mb-2"><span className="font-bold">"{shgToDelete.name}"</span> குழுவை நீக்க விரும்புகிறீர்களா?</p>
              <p className="text-sm text-danger font-medium mb-4">இந்த குழுவில் உள்ள அனைத்து விவசாயிகளும் நீக்கப்படுவார்கள்.</p>
              <div className="flex gap-2">
                <Button onClick={() => setShgToDelete(null)} variant="outline" className="flex-1">ரத்து செய்</Button>
                <Button onClick={confirmDeleteShg} className="flex-1 bg-danger text-danger-foreground hover:bg-danger/90">நீக்கு</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ── Farmer detail view ───────────────────────────────────────────────────────
  if (selectedFarmer) {
    const { birdUpdates, vaccinations, demands, disease } = farmerDetails;
    const loans = demands.filter((d) => d.type === "Loan");
    const feedDemands = demands.filter((d) => d.type === "Feed Stock");
    const vaxRecords = vaccinations.filter((v) => v.type !== "deworming");
    const dewRecords = vaccinations.filter((v) => v.type === "deworming");

    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => setSelectedFarmer(null)} className="self-start gap-2">
          <ArrowLeft size={16} /> {t("back")}
        </Button>
        <Card className="p-5 bg-card">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{selectedFarmer.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedFarmer.hamlet} • {selectedFarmer.shg_name} • {selectedFarmer.phone}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setFarmerToDelete(true)} className="border-danger text-danger gap-1 shrink-0">
              <Trash2 size={14} /> நீக்கு
            </Button>
          </div>
        </Card>

        {/* Delete confirmation dialog */}
        {farmerToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="p-6 bg-card max-w-sm w-full">
              <h3 className="text-lg font-bold text-foreground mb-3">⚠️ எச்சரிக்கை</h3>
              <p className="text-sm text-foreground mb-2">
                <span className="font-bold">"{selectedFarmer.name}"</span> இந்த விவசாயியை நீக்க விரும்புகிறீர்களா?
              </p>
              <p className="text-sm text-danger font-medium mb-4">இந்த செயலை மீள்படுத்த முடியாது.</p>
              <div className="flex gap-2">
                <Button onClick={() => setFarmerToDelete(false)} variant="outline" className="flex-1">ரத்து செய்</Button>
                <Button onClick={confirmDeleteFarmer} className="flex-1 bg-danger text-danger-foreground hover:bg-danger/90">நீக்கு</Button>
              </div>
            </Card>
          </div>
        )}

        <Card className="p-4 bg-card">
          <h3 className="text-base font-bold mb-3 text-foreground">{t("birdUpdateHistory")}</h3>
          {birdUpdates.length === 0 ? <p className="text-sm text-muted-foreground">{t("noData")}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground">{t("week")}</th>
                  <th className="text-center py-2 text-muted-foreground">3 மாதத்திற்குள்</th>
                  <th className="text-center py-2 text-muted-foreground">3 மாதத்திற்கு மேல்</th>
                  <th className="text-center py-2 text-muted-foreground">{t("total")}</th>
                </tr></thead>
                <tbody>{birdUpdates.map((u) => (
                  <tr key={u._id} className="border-b border-border/50">
                    <td className="py-2">{formatDate(u.weekDate)}</td>
                    <td className="text-center py-2">{u.chicks}</td>
                    <td className="text-center py-2">{u.layers}</td>
                    <td className="text-center py-2 font-bold">{u.chicks + u.layers}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-4 bg-card">
          <h3 className="text-base font-bold mb-3 text-foreground">{t("vaccinationHistory")}</h3>
          {vaxRecords.length === 0 ? <p className="text-sm text-muted-foreground">{t("noData")}</p> : (
            <div className="flex flex-col gap-2">{vaxRecords.map((v) => (
              <div key={v._id} className="flex justify-between py-1.5 border-b border-border/30 text-sm">
                <span className="text-foreground">{v.type}</span>
                {/* Older entries may use dateGiven; completed records may use completedDate. */}
                <span className="text-muted-foreground">{formatDate(v.dateGiven || v.completedDate)} → {formatDate(v.nextDueDate)}</span>
              </div>
            ))}</div>
          )}
        </Card>

        <Card className="p-4 bg-card">
          <h3 className="text-base font-bold mb-3 text-foreground">{t("dewormingHistory")}</h3>
          {dewRecords.length === 0 ? <p className="text-sm text-muted-foreground">{t("noData")}</p> : (
            <div className="flex flex-col gap-2">{dewRecords.map((v) => (
              <div key={v._id} className="flex justify-between py-1.5 border-b border-border/30 text-sm">
                <span className="text-muted-foreground">{formatDate(v.dateGiven || v.completedDate)}</span>
                <span className="text-muted-foreground">→ {formatDate(v.nextDueDate)}</span>
              </div>
            ))}</div>
          )}
        </Card>

        <Card className="p-4 bg-card">
          <h3 className="text-base font-bold mb-3 text-foreground">கடன் கோரிக்கைகள்</h3>
          {loans.length === 0 ? <p className="text-sm text-muted-foreground">{t("noData")}</p> : (
            <div className="flex flex-col gap-2">{loans.map((d) => (
              <div key={d._id} className="flex items-center justify-between py-1.5 border-b border-border/30">
                <div>
                  <p className="text-sm font-bold text-warning">₹{(d.amount || 0).toLocaleString()}</p>
                  {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                </div>
                <Badge className={d.status === "Completed" ? "bg-success text-success-foreground" : d.status === "Rejected" ? "bg-danger text-danger-foreground" : "bg-warning text-warning-foreground"}>{d.status}</Badge>
              </div>
            ))}</div>
          )}
        </Card>

        <Card className="p-4 bg-card">
          <h3 className="text-base font-bold mb-3 text-foreground">தீவன கோரிக்கைகள்</h3>
          {feedDemands.length === 0 ? <p className="text-sm text-muted-foreground">{t("noData")}</p> : (
            <div className="flex flex-col gap-2">{feedDemands.map((d) => (
              <div key={d._id} className="flex items-center justify-between py-1.5 border-b border-border/30">
                <p className="text-sm text-foreground">Qty: {d.quantity}{d.notes ? ` • ${d.notes}` : ""}</p>
                <Badge className={d.status === "Completed" ? "bg-success text-success-foreground" : d.status === "Rejected" ? "bg-danger text-danger-foreground" : "bg-warning text-warning-foreground"}>{d.status}</Badge>
              </div>
            ))}</div>
          )}
        </Card>

        <Card className="p-4 bg-card">
          <h3 className="text-base font-bold mb-3 text-foreground">{t("diseaseReports")}</h3>
          {disease.length === 0 ? <p className="text-sm text-muted-foreground">{t("noData")}</p> : (
            <div className="flex flex-col gap-2">{disease.map((r) => (
              <div key={r._id} className="flex items-start justify-between py-1 border-b border-border/30">
                <div>
                  <p className="text-sm text-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.reportedAt)}</p>
                </div>
                <Badge className={r.status === "Reviewed" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>{r.status}</Badge>
              </div>
            ))}</div>
          )}
        </Card>
      </div>
    );
  }

  // ── Farmer list ──────────────────────────────────────────────────────────────
  const filtered = farmers.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.phone.includes(search);
    const matchHamlet = !hamletFilter || f.hamlet === hamletFilter;
    return matchSearch && matchHamlet;
  });
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-border pb-2">
        <button onClick={() => setSubTab("farmers")} className={`text-sm font-semibold px-3 py-1 rounded-md ${subTab === "farmers" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t("farmers")}</button>
        <button onClick={() => setSubTab("shg")} className="text-sm font-semibold px-3 py-1 rounded-md text-muted-foreground">SHG குழுக்கள்</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={t("searchFarmers")} className="pl-9" />
        </div>
        <select
          value={hamletFilter}
          onChange={(e) => { setHamletFilter(e.target.value); setPage(0); }}
          disabled={hamletsLoading}
          className="border border-input rounded-md px-3 py-2 text-sm bg-card text-foreground disabled:opacity-60"
        >
          <option value="">{hamletsLoading ? t("loading") : t("allHamlets")}</option>
          {hamlets.map((h) => {
            const label = hamletDisplayName(h, lang);
            return <option key={h._id} value={label}>{label}</option>;
          })}
        </select>
      </div>

      <Card className="p-0 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">{t("farmerName")}</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">{t("hamlet")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((f) => (
                <tr key={f._id} onClick={() => handleSelectFarmer(f)} className="border-b border-border/50 cursor-pointer hover:bg-muted/50">
                  <td className="py-3 px-4 text-foreground font-medium">{f.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{f.hamlet}</td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={2} className="py-6 text-center text-muted-foreground text-sm">விவசாயிகள் இல்லை</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>←</Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>→</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CrpFarmersTab;
