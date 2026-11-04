import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { api, Crp, Hamlet } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Plus, Pencil, Trash2, RefreshCw, MapPin, KeyRound } from "lucide-react";

const DESIGNATIONS = ["CRP", "PLF Representative", "Animal Husbandry Officer"];

function hamletNames(crp: Crp): string {
  const list = crp.assignedHamlets || [];
  if (!list.length) return "—";
  return list.map((h: any) => (typeof h === "string" ? h : h.name)).join(", ");
}

const emptyCreateForm = { name: "", phone: "", designation: DESIGNATIONS[0], assignedLocation: "", password: "" };

const CrpManagement = () => {
  const { t } = useLanguage();
  const [crps, setCrps] = useState<Crp[]>([]);
  const [hamlets, setHamlets] = useState<Hamlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createHamletIds, setCreateHamletIds] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  const [editing, setEditing] = useState<Crp | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", designation: DESIGNATIONS[0], assignedLocation: "" });
  const [editLoading, setEditLoading] = useState(false);

  const [assigning, setAssigning] = useState<Crp | null>(null);
  const [assignHamletIds, setAssignHamletIds] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Crp | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [resetPinTarget, setResetPinTarget] = useState<Crp | null>(null);
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
      await api.adminResetUserPassword(resetPinTarget.phone, newPin);
      toast.success(`${t("pinResetSuccessToast")} (${newPin})`);
      setResetPinTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset PIN");
    } finally {
      setResetPinLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [crpList, hamletList] = await Promise.all([api.getCrps(), api.getHamlets()]);
      setCrps(crpList);
      setHamlets(hamletList);
    } catch (err: any) {
      setError(err?.message || t("adminLoadFailedToast"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    const { name, phone, designation, assignedLocation, password } = createForm;
    if (!name.trim() || !phone.trim()) {
      toast.error(t("crpNamePhoneRequiredToast"));
      return;
    }
    // New CRPs need an explicit login password — the backend no longer applies a default.
    if (!password.trim()) {
      toast.error(t("crpPasswordRequiredToast"));
      return;
    }
    setCreateLoading(true);
    try {
      await api.createCrp({
        name: name.trim(),
        phone: phone.trim(),
        designation,
        assignedLocation: assignedLocation.trim() || undefined,
        password: password.trim(),
        assignedHamlets: createHamletIds,
      });
      toast.success(t("crpCreatedToast"));
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      setCreateHamletIds([]);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t("crpCreateFailedToast"));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (crp: Crp) => {
    setEditing(crp);
    setEditForm({
      name: crp.name || "",
      phone: crp.phone || "",
      designation: crp.designation || DESIGNATIONS[0],
      assignedLocation: crp.assignedLocation || "",
    });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error(t("crpNamePhoneRequiredToast"));
      return;
    }
    setEditLoading(true);
    try {
      await api.updateCrp(editing._id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        designation: editForm.designation,
        assignedLocation: editForm.assignedLocation.trim(),
      });
      toast.success(t("crpUpdatedToast"));
      setEditing(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t("crpUpdateFailedToast"));
    } finally {
      setEditLoading(false);
    }
  };

  const openAssign = (crp: Crp) => {
    setAssigning(crp);
    const current = (crp.assignedHamlets || []).map((h: any) => (typeof h === "string" ? h : h._id));
    setAssignHamletIds(current);
  };

  const toggleAssignHamlet = (hamletId: string) => {
    setAssignHamletIds((prev) =>
      prev.includes(hamletId) ? prev.filter((id) => id !== hamletId) : [...prev, hamletId]
    );
  };

  const handleAssignSave = async () => {
    if (!assigning) return;
    setAssignLoading(true);
    try {
      await api.assignCrpHamlets(assigning._id, assignHamletIds);
      toast.success(t("crpHamletsAssignedToast"));
      setAssigning(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t("crpAssignFailedToast"));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleToggleStatus = async (crp: Crp) => {
    const nextStatus = crp.status === "Active" ? "Inactive" : "Active";
    setStatusTogglingId(crp._id);
    try {
      await api.updateCrpStatus(crp._id, nextStatus);
      toast.success(t("crpStatusUpdatedToast"));
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t("crpStatusUpdateFailedToast"));
    } finally {
      setStatusTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteCrp(deleteTarget._id);
      toast.success(t("crpDeletedToast"));
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t("crpDeleteFailedToast"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const HamletCheckboxList = ({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) => (
    <div className="border border-input rounded-md max-h-48 overflow-y-auto p-2 flex flex-col gap-1.5">
      {hamlets.length === 0 ? (
        <p className="text-xs text-muted-foreground p-2">{t("noHamletsFound")}</p>
      ) : (
        hamlets.map((hamlet) => (
          <label key={hamlet._id} className="flex items-center gap-2 text-sm py-1 px-1.5 rounded hover:bg-accent cursor-pointer">
            <Checkbox checked={selected.includes(hamlet._id)} onCheckedChange={() => onToggle(hamlet._id)} />
            <span>{hamlet.nameTa && hamlet.nameEn ? `${hamlet.nameTa} / ${hamlet.nameEn}` : hamlet.nameTa || hamlet.nameEn || hamlet.name}</span>
          </label>
        ))
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("adminCrpManagement")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {t("refresh")}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            {t("createCrp")}
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-border/60 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>{t("refresh")}</Button>
          </div>
        ) : crps.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">{t("noCrpsFound")}</p>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("crpNameLabel")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("crpDesignationLabel")}</TableHead>
                <TableHead>{t("crpLocationLabel")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("assignedHamletsLabel")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crps.map((crp) => (
                <TableRow key={crp._id}>
                  <TableCell className="font-medium">{crp.name}</TableCell>
                  <TableCell>{crp.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{crp.designation || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{crp.assignedLocation || "—"}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleStatus(crp)} disabled={statusTogglingId === crp._id}>
                      {statusTogglingId === crp._id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Badge variant={crp.status === "Active" ? "default" : "secondary"} className="cursor-pointer">
                          {crp.status === "Active" ? t("statusActive") : t("statusInactive")}
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[220px] truncate" title={hamletNames(crp)}>
                    {hamletNames(crp)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8" title={t("assignHamletsTitle")} onClick={() => openAssign(crp)}>
                        <MapPin size={14} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(crp)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary"
                        title={t("resetPin")}
                        onClick={() => { setResetPinTarget(crp); setNewPin("1234"); }}
                      >
                        <KeyRound size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(crp)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create CRP */}
      <Dialog open={createOpen} onOpenChange={(open) => !createLoading && setCreateOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createCrp")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 block">{t("crpNameLabel")}</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("phoneNumber")}</Label>
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("crpDesignationLabel")}</Label>
              <Select value={createForm.designation} onValueChange={(v) => setCreateForm({ ...createForm, designation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("crpLocationLabel")}</Label>
              <Input value={createForm.assignedLocation} onChange={(e) => setCreateForm({ ...createForm, assignedLocation: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("password")} <span className="text-danger">*</span></Label>
              <Input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder={t("crpPasswordDefaultHint")}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("assignedHamletsLabel")}</Label>
              <HamletCheckboxList selected={createHamletIds} onToggle={(id) => setCreateHamletIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>{t("cancel")}</Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? <Loader2 className="animate-spin" size={16} /> : t("createHamletButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit CRP */}
      <Dialog open={!!editing} onOpenChange={(open) => !editLoading && !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editCrpTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 block">{t("crpNameLabel")}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("phoneNumber")}</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("crpDesignationLabel")}</Label>
              <Select value={editForm.designation} onValueChange={(v) => setEditForm({ ...editForm, designation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("crpLocationLabel")}</Label>
              <Input value={editForm.assignedLocation} onChange={(e) => setEditForm({ ...editForm, assignedLocation: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editLoading}>{t("cancel")}</Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? <Loader2 className="animate-spin" size={16} /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Hamlets */}
      <Dialog open={!!assigning} onOpenChange={(open) => !assignLoading && !open && setAssigning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignHamletsTitle")}</DialogTitle>
          </DialogHeader>
          <HamletCheckboxList selected={assignHamletIds} onToggle={toggleAssignHamlet} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)} disabled={assignLoading}>{t("cancel")}</Button>
            <Button onClick={handleAssignSave} disabled={assignLoading}>
              {assignLoading ? <Loader2 className="animate-spin" size={16} /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !deleteLoading && !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCrpTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCrpConfirm").replace("{name}", deleteTarget?.name || "")}
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

export default CrpManagement;
