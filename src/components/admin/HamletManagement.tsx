import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { api, Hamlet, Crp, CrpRef } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { Loader2, Plus, Pencil, Trash2, RefreshCw, MapPinned } from "lucide-react";

const NO_CRP = "__none__";

function crpLabel(crp: CrpRef | string | null | undefined, t: (k: any) => string): string {
  if (!crp) return t("noCrpAssigned");
  if (typeof crp === "string") return crp;
  return crp.phone ? `${crp.name} (${crp.phone})` : crp.name;
}

const getHamletNameTa = (hamlet: Hamlet) => hamlet.nameTa || hamlet.name || "";
const getHamletNameEn = (hamlet: Hamlet) => hamlet.nameEn || hamlet.name || "";
const getHamletDisplayName = (hamlet: Hamlet) => getHamletNameEn(hamlet) || getHamletNameTa(hamlet);

interface HamletManagementProps {
  // Lets a hamlet row jump straight into the Streets section, pre-scoped to
  // that hamlet — Streets itself is a separate top-level Admin section.
  onViewStreets?: (hamlet: Hamlet) => void;
}

const HamletManagement = ({ onViewStreets }: HamletManagementProps) => {
  const { t } = useLanguage();
  const [hamlets, setHamlets] = useState<Hamlet[]>([]);
  const [crps, setCrps] = useState<Crp[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createNameTa, setCreateNameTa] = useState("");
  const [createNameEn, setCreateNameEn] = useState("");
  const [createCrpId, setCreateCrpId] = useState(NO_CRP);
  const [createLoading, setCreateLoading] = useState(false);

  const [editing, setEditing] = useState<Hamlet | null>(null);
  const [editNameTa, setEditNameTa] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editCrpId, setEditCrpId] = useState(NO_CRP);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Hamlet | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [hamletList, crpList] = await Promise.all([api.getHamlets(), api.getCrps()]);
      setHamlets(hamletList);
      setCrps(crpList);
    } catch (err: any) {
      toast.error(err?.message || t("adminLoadFailedToast"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const openEdit = (hamlet: Hamlet) => {
    setEditing(hamlet);
    setEditNameTa(getHamletNameTa(hamlet));
    setEditNameEn(getHamletNameEn(hamlet));
    const currentCrpId = typeof hamlet.crpId === "string" ? hamlet.crpId : hamlet.crpId?._id;
    setEditCrpId(currentCrpId || NO_CRP);
  };

  const handleCreate = async () => {
    const nameTa = createNameTa.trim();
    const nameEn = createNameEn.trim();
    if (!nameTa || !nameEn) {
      toast.error(t("hamletNamesRequiredToast"));
      return;
    }
    setCreateLoading(true);
    try {
      await api.createHamlet(nameTa, nameEn, createCrpId === NO_CRP ? null : createCrpId);
      toast.success(t("hamletCreatedToast"));
      setCreateOpen(false);
      setCreateNameTa("");
      setCreateNameEn("");
      setCreateCrpId(NO_CRP);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t("hamletCreateFailedToast"));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const nameTa = editNameTa.trim();
    const nameEn = editNameEn.trim();
    if (!nameTa || !nameEn) {
      toast.error(t("hamletNamesRequiredToast"));
      return;
    }
    setEditLoading(true);
    try {
      await api.updateHamlet(editing._id, {
        nameTa,
        nameEn,
        crpId: editCrpId === NO_CRP ? null : editCrpId,
      });
      toast.success(t("hamletUpdatedToast"));
      setEditing(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t("hamletUpdateFailedToast"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteHamlet(deleteTarget._id);
      toast.success(t("hamletDeletedToast"));
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      if (err?.streetCount !== undefined || err?.farmerCount !== undefined) {
        toast.error(
          t("hamletDeleteBlockedToast")
            .replace("{streetCount}", String(err.streetCount ?? 0))
            .replace("{farmerCount}", String(err.farmerCount ?? 0))
        );
      } else {
        toast.error(err?.message || t("hamletDeleteFailedToast"));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const CrpSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={t("selectCrpPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CRP}>{t("noCrpAssigned")}</SelectItem>
        {crps.map((crp) => (
          <SelectItem key={crp._id} value={crp._id}>
            {crp.name} ({crp.phone})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("adminHamletManagement")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {t("refresh")}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            {t("createHamlet")}
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-border/60 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : hamlets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">{t("noHamletsFound")}</p>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("nameTaLabel")}</TableHead>
                <TableHead>{t("nameEnLabel")}</TableHead>
                <TableHead>{t("assignedCrpLabel")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hamlets.map((hamlet) => (
                <TableRow key={hamlet._id}>
                  <TableCell className="font-medium">{getHamletNameTa(hamlet)}</TableCell>
                  <TableCell>{getHamletNameEn(hamlet)}</TableCell>
                  <TableCell className="text-muted-foreground">{crpLabel(hamlet.crpId, t)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {onViewStreets && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title={t("manageStreets")}
                          onClick={() => onViewStreets(hamlet)}
                        >
                          <MapPinned size={14} />
                        </Button>
                      )}
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(hamlet)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(hamlet)}
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

      {/* Create Hamlet */}
      <Dialog open={createOpen} onOpenChange={(open) => !createLoading && setCreateOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createHamlet")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 block">{t("nameTaLabel")}</Label>
              <Input value={createNameTa} onChange={(e) => setCreateNameTa(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("nameEnLabel")}</Label>
              <Input value={createNameEn} onChange={(e) => setCreateNameEn(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("assignedCrpLabel")}</Label>
              <CrpSelect value={createCrpId} onChange={setCreateCrpId} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? <Loader2 className="animate-spin" size={16} /> : t("createHamletButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Hamlet */}
      <Dialog open={!!editing} onOpenChange={(open) => !editLoading && !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editHamletTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 block">{t("nameTaLabel")}</Label>
              <Input value={editNameTa} onChange={(e) => setEditNameTa(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("nameEnLabel")}</Label>
              <Input value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("assignedCrpLabel")}</Label>
              <CrpSelect value={editCrpId} onChange={setEditCrpId} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editLoading}>
              {t("cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? <Loader2 className="animate-spin" size={16} /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !deleteLoading && !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteHamletTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteHamletConfirm").replace("{name}", deleteTarget ? getHamletDisplayName(deleteTarget) : "")}
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
    </div>
  );
};

export default HamletManagement;
