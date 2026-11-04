import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { api, Farmer, Hamlet, Street } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Check, X, Trash2, RefreshCw, MapPin, Search, KeyRound } from "lucide-react";

type ViewMode = "all" | "unresolved";
type ApprovalFilter = "all" | "pending" | "approved";

function displayRef(ref: any): string {
  if (!ref) return "—";
  if (typeof ref === "string") return ref;
  return ref.name || ref.nameEn || ref.nameTa || "—";
}

const FarmerManagement = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [unresolved, setUnresolved] = useState<Farmer[]>([]);
  const [unresolvedLoading, setUnresolvedLoading] = useState(true);
  const [unresolvedError, setUnresolvedError] = useState<string | null>(null);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Farmer | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Farmer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [assigningFarmer, setAssigningFarmer] = useState<Farmer | null>(null);
  const [hamlets, setHamlets] = useState<Hamlet[]>([]);
  const [hamletsLoading, setHamletsLoading] = useState(false);
  const [assignHamletId, setAssignHamletId] = useState("");
  const [assignStreets, setAssignStreets] = useState<Street[]>([]);
  const [assignStreetsLoading, setAssignStreetsLoading] = useState(false);
  const [assignStreetId, setAssignStreetId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [resetPinTarget, setResetPinTarget] = useState<Farmer | null>(null);
  const [newPin, setNewPin] = useState("1234");
  const [resetPinLoading, setResetPinLoading] = useState(false);

  const handleResetPin = async () => {
    if (!resetPinTarget) return;
    if (!/^\d{4}$/.test(newPin)) {
      toast.error(t("passwordFormatError"));
      return;
    }
    setResetPinLoading(true);
    try {
      await api.adminResetUserPassword(resetPinTarget._id, newPin);
      toast.success(`${t("pinResetSuccessToast")} (${newPin})`);
      setResetPinTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset PIN");
    } finally {
      setResetPinLoading(false);
    }
  };

  const loadFarmers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getFarmers();
      setFarmers(list);
    } catch (err: any) {
      setError(err?.message || t("adminLoadFailedToast"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadUnresolved = useCallback(async () => {
    setUnresolvedLoading(true);
    setUnresolvedError(null);
    try {
      const list = await api.getUnresolvedFarmers();
      setUnresolved(list);
    } catch (err: any) {
      setUnresolvedError(err?.message || t("adminLoadFailedToast"));
    } finally {
      setUnresolvedLoading(false);
    }
  }, [t]);

  useEffect(() => { loadFarmers(); loadUnresolved(); }, [loadFarmers, loadUnresolved]);

  const refreshAfterMutation = () => Promise.all([loadFarmers(), loadUnresolved()]);

  const handleApprove = async (farmer: Farmer) => {
    setActioningId(farmer._id);
    try {
      await api.approveFarmer(farmer._id);
      toast.success(t("farmerApprovedToast"));
      await refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || t("farmerApproveFailedToast"));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await api.rejectFarmer(rejectTarget._id);
      toast.success(t("farmerRejectedToast"));
      setRejectTarget(null);
      await refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || t("farmerRejectFailedToast"));
    } finally {
      setRejectLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteFarmer(deleteTarget._id);
      toast.success(t("farmerDeletedToast"));
      setDeleteTarget(null);
      await refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || t("farmerDeleteFailedToast"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAssignLocation = async (farmer: Farmer) => {
    setAssigningFarmer(farmer);
    setAssignHamletId("");
    setAssignStreetId("");
    setAssignStreets([]);
    if (hamlets.length === 0) {
      setHamletsLoading(true);
      try {
        setHamlets(await api.getHamlets());
      } catch (err: any) {
        toast.error(err?.message || t("adminLoadFailedToast"));
      } finally {
        setHamletsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!assignHamletId) { setAssignStreets([]); setAssignStreetId(""); return; }
    setAssignStreetId("");
    setAssignStreetsLoading(true);
    api.getStreetsByHamlet(assignHamletId)
      .then(setAssignStreets)
      .catch((err: any) => toast.error(err?.message || t("adminLoadFailedToast")))
      .finally(() => setAssignStreetsLoading(false));
  }, [assignHamletId, t]);

  const handleAssignLocationSave = async () => {
    if (!assigningFarmer || !assignHamletId) {
      toast.error(t("hamletRequiredToast"));
      return;
    }
    setAssignLoading(true);
    try {
      await api.assignFarmerLocation(assigningFarmer._id, assignHamletId, assignStreetId || null);
      toast.success(t("farmerLocationAssignedToast"));
      setAssigningFarmer(null);
      await refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.message || t("farmerLocationAssignFailedToast"));
    } finally {
      setAssignLoading(false);
    }
  };

  const filteredFarmers = farmers.filter((f) => {
    if (approvalFilter === "pending" && f.approved) return false;
    if (approvalFilter === "approved" && !f.approved) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const haystack = `${f.name} ${f.phone} ${f.shg_name || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("adminFarmerManagement")}</h2>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "all" ? "default" : "outline"} size="sm" onClick={() => setViewMode("all")}>
            {t("allFarmersTab")}
          </Button>
          <Button variant={viewMode === "unresolved" ? "default" : "outline"} size="sm" onClick={() => setViewMode("unresolved")}>
            {t("unresolvedLocationTab")}
            {unresolved.length > 0 && <Badge variant="secondary" className="ml-1">{unresolved.length}</Badge>}
          </Button>
        </div>
      </div>

      {viewMode === "all" ? (
        <>
          <Card className="p-3 sm:p-4 flex items-center gap-3 flex-wrap border-border/60 shadow-sm">
            <Select value={approvalFilter} onValueChange={(v) => setApprovalFilter(v as ApprovalFilter)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                <SelectItem value="pending">{t("filterPending")}</SelectItem>
                <SelectItem value="approved">{t("filterApproved")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchFarmersPlaceholder")}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadFarmers} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              {t("refresh")}
            </Button>
          </Card>

          <Card className="p-0 overflow-hidden border-border/60 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={loadFarmers}>{t("refresh")}</Button>
              </div>
            ) : filteredFarmers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">{t("noFarmersFound")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>{t("farmerName")}</TableHead>
                      <TableHead>{t("phone")}</TableHead>
                      <TableHead>{t("hamlet")}</TableHead>
                      <TableHead>{t("street")}</TableHead>
                      <TableHead>{t("shgGroupName")}</TableHead>
                      <TableHead>{t("houseNo")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("assignedCrpLabel")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFarmers.map((farmer) => (
                      <TableRow key={farmer._id}>
                        <TableCell className="font-medium">{farmer.name}</TableCell>
                        <TableCell>{farmer.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{displayRef(farmer.hamletId) !== "—" ? displayRef(farmer.hamletId) : (farmer.hamlet || "—")}</TableCell>
                        <TableCell className="text-muted-foreground">{displayRef(farmer.streetId) !== "—" ? displayRef(farmer.streetId) : (farmer.street || "—")}</TableCell>
                        <TableCell className="text-muted-foreground">{farmer.shg_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{farmer.houseNo || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={farmer.approved ? "default" : "secondary"}>
                            {farmer.approved ? t("approved") : t("pending")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{displayRef(farmer.crpId)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {!farmer.approved && (
                              <Button
                                variant="outline" size="icon" className="h-8 w-8 text-success hover:text-success"
                                title={t("approve")} disabled={actioningId === farmer._id}
                                onClick={() => handleApprove(farmer)}
                              >
                                {actioningId === farmer._id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                              </Button>
                            )}
                            {!farmer.approved && (
                              <Button
                                variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                title={t("reject")} onClick={() => setRejectTarget(farmer)}
                              >
                                <X size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline" size="icon" className="h-8 w-8 text-primary hover:text-primary"
                              title={t("resetPin")} onClick={() => { setResetPinTarget(farmer); setNewPin("1234"); }}
                            >
                              <KeyRound size={14} />
                            </Button>
                            <Button
                              variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              title={t("delete")} onClick={() => setDeleteTarget(farmer)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={loadUnresolved} disabled={unresolvedLoading}>
              <RefreshCw size={15} className={unresolvedLoading ? "animate-spin" : ""} />
              {t("refresh")}
            </Button>
          </div>
          <Card className="p-0 overflow-hidden border-border/60 shadow-sm">
            {unresolvedLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : unresolvedError ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <p className="text-sm text-destructive">{unresolvedError}</p>
                <Button variant="outline" size="sm" onClick={loadUnresolved}>{t("refresh")}</Button>
              </div>
            ) : unresolved.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">{t("noUnresolvedFarmers")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>{t("farmerName")}</TableHead>
                      <TableHead>{t("phone")}</TableHead>
                      <TableHead>{t("hamlet")} ({t("legacyLabel")})</TableHead>
                      <TableHead>{t("street")} ({t("legacyLabel")})</TableHead>
                      <TableHead>{t("shgGroupName")}</TableHead>
                      <TableHead>{t("houseNo")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unresolved.map((farmer) => (
                      <TableRow key={farmer._id}>
                        <TableCell className="font-medium">{farmer.name}</TableCell>
                        <TableCell>{farmer.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{farmer.hamlet || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{farmer.street || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{farmer.shg_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{farmer.houseNo || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="icon" className="h-8 w-8" title={t("assignLocationTitle")} onClick={() => openAssignLocation(farmer)}>
                              <MapPin size={14} />
                            </Button>
                            <Button
                              variant="outline" size="icon" className="h-8 w-8 text-primary hover:text-primary"
                              title={t("resetPin")} onClick={() => { setResetPinTarget(farmer); setNewPin("1234"); }}
                            >
                              <KeyRound size={14} />
                            </Button>
                            <Button
                              variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              title={t("delete")} onClick={() => setDeleteTarget(farmer)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Reject confirmation */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !rejectLoading && !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rejectFarmerTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rejectFarmerConfirm").replace("{name}", rejectTarget?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectLoading}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleReject(); }}
              disabled={rejectLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectLoading ? <Loader2 className="animate-spin" size={16} /> : t("reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !deleteLoading && !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFarmerTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteFarmerConfirm").replace("{name}", deleteTarget?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="animate-spin" size={16} /> : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Location */}
      <Dialog open={!!assigningFarmer} onOpenChange={(open) => !assignLoading && !open && setAssigningFarmer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignLocationTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 block">{t("selectHamletLabel")}</Label>
              <Select value={assignHamletId} onValueChange={setAssignHamletId} disabled={hamletsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={hamletsLoading ? t("loading") : t("selectHamletPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {hamlets.map((hamlet) => (
                    <SelectItem key={hamlet._id} value={hamlet._id}>
                      {hamlet.nameTa && hamlet.nameEn ? `${hamlet.nameTa} / ${hamlet.nameEn}` : hamlet.nameTa || hamlet.nameEn || hamlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("selectStreetLabel")}</Label>
              <Select value={assignStreetId} onValueChange={setAssignStreetId} disabled={!assignHamletId || assignStreetsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={!assignHamletId ? t("selectHamletFirstPlaceholder") : (assignStreetsLoading ? t("loading") : t("selectStreetPlaceholder"))} />
                </SelectTrigger>
                <SelectContent>
                  {assignStreets.map((street) => (
                    <SelectItem key={street._id} value={street._id}>
                      {street.nameTa && street.nameEn ? `${street.nameTa} / ${street.nameEn}` : street.nameTa || street.nameEn || street.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningFarmer(null)} disabled={assignLoading}>{t("cancel")}</Button>
            <Button onClick={handleAssignLocationSave} disabled={assignLoading || !assignHamletId}>
              {assignLoading ? <Loader2 className="animate-spin" size={16} /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reset PIN Dialog */}
      <Dialog open={!!resetPinTarget} onOpenChange={(open) => !resetPinLoading && !open && setResetPinTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} className="text-primary" />
              {t("resetPin")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              {resetPinTarget?.name} ({resetPinTarget?.phone})
            </p>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">{t("newPinLabel")}</Label>
              <Input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                className="text-lg tracking-widest font-bold"
                maxLength={4}
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("resetPinDescription")} 4 digits</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPinTarget(null)} disabled={resetPinLoading}>{t("cancel")}</Button>
            <Button onClick={handleResetPin} disabled={resetPinLoading || newPin.length !== 4}>
              {resetPinLoading ? <Loader2 className="animate-spin" size={16} /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerManagement;
