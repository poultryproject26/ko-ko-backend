import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { api, Hamlet, Street } from "@/lib/api";
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
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

interface StreetManagementProps {
  // Set once when navigating in from a Hamlet row's "Streets" action.
  initialHamletId?: string | null;
}

const StreetManagement = ({ initialHamletId }: StreetManagementProps) => {
  const { t } = useLanguage();
  const [hamlets, setHamlets] = useState<Hamlet[]>([]);
  const [hamletsLoading, setHamletsLoading] = useState(true);
  const [selectedHamletId, setSelectedHamletId] = useState<string>("");

  const [streets, setStreets] = useState<Street[]>([]);
  const [streetsLoading, setStreetsLoading] = useState(false);
  const [streetsError, setStreetsError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createNameTa, setCreateNameTa] = useState("");
  const [createNameEn, setCreateNameEn] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [editing, setEditing] = useState<Street | null>(null);
  const [editNameTa, setEditNameTa] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Street | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadHamlets = useCallback(async () => {
    setHamletsLoading(true);
    try {
      const list = await api.getHamlets();
      setHamlets(list);
    } catch (err: any) {
      toast.error(err?.message || t("adminLoadFailedToast"));
    } finally {
      setHamletsLoading(false);
    }
  }, [t]);

  useEffect(() => { loadHamlets(); }, [loadHamlets]);

  useEffect(() => {
    if (initialHamletId) setSelectedHamletId(initialHamletId);
  }, [initialHamletId]);

  const loadStreets = useCallback(async () => {
    if (!selectedHamletId) { setStreets([]); return; }
    setStreetsLoading(true);
    setStreetsError(null);
    try {
      const list = await api.getStreetsByHamlet(selectedHamletId);
      setStreets(list);
    } catch (err: any) {
      setStreetsError(err?.message || t("adminLoadFailedToast"));
    } finally {
      setStreetsLoading(false);
    }
  }, [selectedHamletId, t]);

  useEffect(() => { loadStreets(); }, [loadStreets]);

  const selectedHamlet = hamlets.find((h) => h._id === selectedHamletId) || null;
  const getStreetNameTa = (street: Street) => street.nameTa || street.name || "";
  const getStreetNameEn = (street: Street) => street.nameEn || street.name || "";
  const getStreetDisplayName = (street: Street) => getStreetNameEn(street) || getStreetNameTa(street);

  const handleCreate = async () => {
    const nameTa = createNameTa.trim();
    const nameEn = createNameEn.trim();
    if (!nameTa || !nameEn) {
      toast.error(t("streetNamesRequiredToast"));
      return;
    }
    setCreateLoading(true);
    try {
      await api.createStreet(selectedHamletId, nameTa, nameEn);
      toast.success(t("streetCreatedToast"));
      setCreateOpen(false);
      setCreateNameTa("");
      setCreateNameEn("");
      await loadStreets();
    } catch (err: any) {
      toast.error(err?.message || t("streetCreateFailedToast"));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (street: Street) => {
    setEditing(street);
    setEditNameTa(getStreetNameTa(street));
    setEditNameEn(getStreetNameEn(street));
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const nameTa = editNameTa.trim();
    const nameEn = editNameEn.trim();
    if (!nameTa || !nameEn) {
      toast.error(t("streetNamesRequiredToast"));
      return;
    }
    setEditLoading(true);
    try {
      await api.updateStreet(editing._id, { nameTa, nameEn });
      toast.success(t("streetUpdatedToast"));
      setEditing(null);
      await loadStreets();
    } catch (err: any) {
      toast.error(err?.message || t("streetUpdateFailedToast"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteStreet(deleteTarget._id);
      toast.success(t("streetDeletedToast"));
      setDeleteTarget(null);
      await loadStreets();
    } catch (err: any) {
      if (err?.farmerCount !== undefined) {
        toast.error(t("streetDeleteBlockedToast").replace("{farmerCount}", String(err.farmerCount ?? 0)));
      } else {
        toast.error(err?.message || t("streetDeleteFailedToast"));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("adminStreetManagement")}</h2>
      </div>

      <Card className="p-4">
        <Label className="mb-1.5 block">{t("selectHamletLabel")}</Label>
        <Select value={selectedHamletId} onValueChange={setSelectedHamletId} disabled={hamletsLoading}>
          <SelectTrigger className="max-w-sm">
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
      </Card>

      {selectedHamletId && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {t("streetsForHamletLabel")}: <span className="font-semibold text-foreground">{selectedHamlet?.nameEn || selectedHamlet?.nameTa || selectedHamlet?.name}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadStreets} disabled={streetsLoading}>
                <RefreshCw size={15} className={streetsLoading ? "animate-spin" : ""} />
                {t("refresh")}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} />
                {t("createStreet")}
              </Button>
            </div>
          </div>

          <Card className="p-0 overflow-hidden border-border/60 shadow-sm">
            {streetsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : streetsError ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <p className="text-sm text-destructive">{streetsError}</p>
                <Button variant="outline" size="sm" onClick={loadStreets}>{t("refresh")}</Button>
              </div>
            ) : streets.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">{t("noStreetsFound")}</p>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{t("nameTaLabel")}</TableHead>
                    <TableHead>{t("nameEnLabel")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streets.map((street) => (
                    <TableRow key={street._id}>
                      <TableCell className="font-medium">{getStreetNameTa(street)}</TableCell>
                      <TableCell>{getStreetNameEn(street)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(street)}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(street)}
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
        </>
      )}

      {/* Create Street */}
      <Dialog open={createOpen} onOpenChange={(open) => !createLoading && setCreateOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createStreet")}</DialogTitle>
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

      {/* Edit Street */}
      <Dialog open={!!editing} onOpenChange={(open) => !editLoading && !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editStreetTitle")}</DialogTitle>
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
            <AlertDialogTitle>{t("deleteStreetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteStreetConfirm").replace("{name}", deleteTarget ? getStreetDisplayName(deleteTarget) : "")}
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

export default StreetManagement;
