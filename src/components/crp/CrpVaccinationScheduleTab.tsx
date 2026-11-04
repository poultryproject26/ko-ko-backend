import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Syringe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatVaccinationCalendarDate,
  formatVaccinationSubmissionDate,
  getKolkataTodayCalendarDate,
  getVaccinationStockDueDate,
  isVaccinationStockPendingOnDate,
} from "@/lib/vaccinationDates";

function formatBatchDate(value: string | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

interface Farmer {
  _id: string;
  name: string;
  phone: string;
  hamlet?: string;
}

interface BirdBatch {
  _id: string;
  batchName: string;
  numberOfChicks: number;
  activeBirdCount: number;
  mortalityCount: number;
  batchDate: string;
  batchStatus: "active" | "inactive";
}

interface VaccinationStockRequest {
  _id: string;
  userId?: {
    name?: string;
    phone?: string;
    hamlet?: string;
    hamletId?: { name?: string; nameTa?: string; nameEn?: string } | string;
  } | string;
  withinMonth?: number;
  month2?: number;
  month3?: number;
  month4Plus?: number;
  entryDate?: string | Date | null;
  dueDate?: string | Date | null;
  status?: string | null;
}

function getFarmerHamlet(user: VaccinationStockRequest["userId"]): string {
  if (!user || typeof user === "string") return "—";
  if (typeof user.hamletId === "object" && user.hamletId) {
    return user.hamletId.nameTa || user.hamletId.name || user.hamletId.nameEn || user.hamlet || "—";
  }
  return user.hamlet || "—";
}

function VaccinationDueList() {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(getKolkataTodayCalendarDate);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const {
    data: stockRequests = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<VaccinationStockRequest[]>({
    queryKey: ["crpVaccinationStock"],
    queryFn: () => api.getAllVaccinationStock(),
    staleTime: 0,
  });

  const pendingRequests = stockRequests.filter((stock) =>
    isVaccinationStockPendingOnDate(stock, selectedDate)
  );
  const completedRequestsForDate = stockRequests.filter((stock) =>
    stock.status === "completed" && getVaccinationStockDueDate(stock) === selectedDate
  );

  const handleComplete = async (id: string) => {
    if (completingId) return;
    setCompletingId(id);
    try {
      await api.completeVaccinationStock(id);
      await queryClient.invalidateQueries({ queryKey: ["crpVaccinationStock"] });
      toast.success(t("vaccinationCompleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("vaccinationCompletionFailed"));
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <Card className="p-4 sm:p-5 border-2 border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <Syringe size={20} className="text-green-700" />
        <h2 className="text-lg font-bold text-foreground">{t("vaccinationDueList")}</h2>
      </div>

      <label htmlFor="vaccination-due-date" className="block text-sm font-medium text-foreground mb-1">
        {t("selectedVaccinationDate")}
      </label>
      <Input
        id="vaccination-due-date"
        type="date"
        value={selectedDate}
        onChange={(event) => setSelectedDate(event.target.value)}
        className="mb-2 w-full sm:max-w-xs"
      />
      <p className="text-sm text-muted-foreground mb-4">
        {formatVaccinationCalendarDate(selectedDate)}
      </p>

      {isLoading && (
        <div role="status" className="py-6 text-center text-sm text-muted-foreground">
          {t("loadingVaccinationRequests")}
        </div>
      )}
      {isError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive mb-3">{t("couldNotLoadVaccinationRequests")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            {t("retry")}
          </Button>
        </div>
      )}
      {!isLoading && !isError && pendingRequests.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {completedRequestsForDate.length > 0
            ? t("allVaccinationRequestsCompletedForDate")
            : t("noVaccinationRequestsDueOnDate")}
        </p>
      )}
      {!isLoading && !isError && pendingRequests.length > 0 && (
        <div className="flex flex-col gap-3">
          {pendingRequests.map((stock) => {
            const farmer = typeof stock.userId === "object" ? stock.userId : undefined;
            const quantities = [
              ["vaxWithinMonthAgeLabel", "vaxSubLasota", stock.withinMonth],
              ["vax2MonthAgeLabel", "vaxSubFowlPox", stock.month2],
              ["vax3MonthAgeLabel", "vaxSubInfectiousCoryza", stock.month3],
              ["vax4to7MonthAgeLabel", "vaxSubRdvkDeworming", stock.month4Plus],
            ] as const;

            return (
              <div key={stock._id} className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{farmer?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{t("village")}: {getFarmerHamlet(stock.userId)}</p>
                    <p className="text-xs text-muted-foreground">{t("phoneNumber")}: {farmer?.phone || "—"}</p>
                  </div>
                  <span className="rounded-full bg-warning px-3 py-1 text-xs font-semibold text-warning-foreground">
                    {t("pending")}
                  </span>
                </div>

                <div className="mb-3 rounded-lg border border-green-100 bg-white p-3">
                  <div className="flex flex-col gap-2">
                    {quantities.map(([ageKey, vaccineKey, quantity]) => (
                      <p key={ageKey} className="flex flex-wrap justify-between gap-x-3 text-xs text-foreground">
                        <span>{t(ageKey)} ({t(vaccineKey)})</span>
                        <span className="font-bold">{quantity || 0} {t("birdsUnit")}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mb-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t("vaccinationRequestSubmitted")}: {formatVaccinationSubmissionDate(stock.entryDate)}
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {t("vaccinationRequestDeadline")}: {formatVaccinationCalendarDate(getVaccinationStockDueDate(stock))}
                  </p>
                </div>

                <Button
                  type="button"
                  disabled={completingId !== null}
                  onClick={() => void handleComplete(stock._id)}
                  className="w-full bg-success text-success-foreground hover:bg-success/90"
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  {completingId === stock._id
                    ? t("completingVaccination")
                    : t("markVaccinationRequestCompleted")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function BatchCard({ batch, onRefetch }: { batch: BirdBatch; onRefetch: () => void }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting || !window.confirm(t("deleteBatchConfirm"))) return;
    setDeleting(true);
    try {
      await api.deleteBatch(batch._id);
      toast.success(`${t("batchDeleted")}: ${batch.batchName}`);
      onRefetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete batch");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-muted/30 rounded-xl border border-border/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex-1 flex items-center justify-between text-left"
        >
          <div>
            <p className="text-sm font-bold text-foreground">{batch.batchName}</p>
            <p className="text-xs text-muted-foreground">
              {batch.numberOfChicks} birds · Batch date: {formatBatchDate(batch.batchDate)}
            </p>
          </div>
          {expanded
            ? <ChevronUp size={15} className="text-muted-foreground" />
            : <ChevronDown size={15} className="text-muted-foreground" />}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="text-xs font-semibold text-danger border border-danger/20 rounded-xl px-2 py-1 hover:bg-danger/10"
        >
          {deleting ? "..." : t("delete")}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p>{t("activeBirdCount")}: {batch.activeBirdCount}</p>
          <p>{t("mortalityCount")}: {batch.mortalityCount}</p>
          <p>{t("batchStatus")}: {batch.batchStatus}</p>
          <p>{t("vaccinationRequestsManagedSeparately")}</p>
        </div>
      )}
    </div>
  );
}

function FarmerBatchRow({ farmer }: { farmer: Farmer }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [numChicks, setNumChicks] = useState("");
  const [batchDate, setBatchDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: batches = [], isLoading, refetch } = useQuery({
    queryKey: ["farmerBatches", farmer._id],
    queryFn: () => api.getFarmerBatches(farmer._id),
    enabled: expanded,
    staleTime: 60_000,
  });

  const handleAddBatch = async () => {
    if (!batchName || !batchDate) {
      toast.error(t("batchNameAndDateRequired"));
      return;
    }

    setSaving(true);
    try {
      await api.createBatch({
        userId: farmer._id,
        batchName,
        numberOfChicks: Number.parseInt(numChicks, 10) || 0,
        batchDate,
      });
      toast.success(`${t("batchCreated")}: ${batchName}`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["allBatches"] });
      setBatchName("");
      setNumChicks("");
      setBatchDate("");
      setShowAddBatch(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create batch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Syringe size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{farmer.name}</p>
            <p className="text-xs text-muted-foreground">{farmer.hamlet || "—"} · {farmer.phone}</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-muted-foreground" />
          : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/60 p-4 flex flex-col gap-3">
          {showAddBatch ? (
            <div className="bg-muted/30 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-xs font-bold text-foreground">{t("newBirdBatch")}</p>
              <Input
                placeholder="Batch name (e.g. Batch 1)"
                value={batchName}
                onChange={(event) => setBatchName(event.target.value)}
                className="text-sm"
              />
              <Input
                placeholder={t("numberOfBirds")}
                type="number"
                min="0"
                value={numChicks}
                onChange={(event) => setNumChicks(event.target.value)}
                className="text-sm"
              />
              <Input
                aria-label="Batch date"
                type="date"
                value={batchDate}
                onChange={(event) => setBatchDate(event.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAddBatch(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" disabled={saving} onClick={handleAddBatch}>
                  {saving ? "..." : t("createBatch")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddBatch(true)}
              className="flex items-center gap-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/5"
            >
              <Plus size={14} /> {t("addNewBatch")}
            </button>
          )}

          {isLoading && <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />}
          {!isLoading && batches.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">{t("noBatchesYet")}</p>
          )}
          {batches.map((batch: BirdBatch) => (
            <BatchCard key={batch._id} batch={batch} onRefetch={() => { void refetch(); }} />
          ))}
        </div>
      )}
    </div>
  );
}

const CrpVaccinationScheduleTab = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const { data: farmers = [], isLoading, isError } = useQuery({
    queryKey: ["crpFarmers"],
    queryFn: () => api.getFarmers(),
    staleTime: 60_000,
  });

  const filteredFarmers = (farmers as Farmer[]).filter((farmer) =>
    !search
    || farmer.name.toLowerCase().includes(search.toLowerCase())
    || farmer.phone.includes(search)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #2E7D32, #4CAF50)" }}>
        <div className="flex items-center gap-3">
          <Syringe size={22} className="text-white" />
          <div>
            <p className="text-base font-bold">{t("birdBatches")}</p>
            <p className="text-xs opacity-80">{t("manageBirdBatches")}</p>
          </div>
        </div>
      </div>

      <VaccinationDueList />

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("searchFarmers")}
        className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-16 bg-white rounded-2xl border border-border/60 animate-pulse" />)}
        </div>
      )}
      {isError && (
        <div role="alert" className="text-sm text-destructive">
          {t("couldNotLoadFarmers")}
        </div>
      )}
      {!isLoading && !isError && filteredFarmers.length === 0 && (
        <div className="bg-white rounded-2xl border border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("noFarmersFound")}</p>
        </div>
      )}
      {!isLoading && !isError && (
        <div className="flex flex-col gap-3">
          {filteredFarmers.map((farmer) => <FarmerBatchRow key={farmer._id} farmer={farmer} />)}
        </div>
      )}
    </div>
  );
};

export default CrpVaccinationScheduleTab;
