export interface BirdUpdate {
  id: string;
  weekDate: string;
  chicks: number;
  growers: number;
  layers: number;
  broilers: number;
}

export interface ServiceDemand {
  id: string;
  type: string;
  quantity: number;
  status: string;
}

export interface DiseaseReport {
  id: string;
  description: string;
  photo?: string;
  reportedAt: string;
  status: "Pending" | "Reviewed";
}

export interface Notification {
  id: string;
  type: "disease" | "market" | "tip";
  message: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  birdUpdates: "bird_updates",
  serviceDemands: "service_demands",
  diseaseReports: "disease_reports",
};

function getWeekString(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export function getBirdUpdates(): BirdUpdate[] {
  const data = localStorage.getItem(STORAGE_KEYS.birdUpdates);
  return data ? JSON.parse(data) : [];
}

export function addBirdUpdate(update: Omit<BirdUpdate, "id" | "weekDate">) {
  const updates = getBirdUpdates();
  updates.unshift({
    ...update,
    id: crypto.randomUUID(),
    weekDate: getWeekString(),
  });
  localStorage.setItem(STORAGE_KEYS.birdUpdates, JSON.stringify(updates));
}

export function hasSubmittedThisWeek(): boolean {
  const updates = getBirdUpdates();
  const thisWeek = getWeekString();
  return updates.some((u) => u.weekDate === thisWeek);
}

export function getLatestBirdTotal(): number {
  const updates = getBirdUpdates();
  if (updates.length === 0) return 0;
  const latest = updates[0];
  return latest.chicks + latest.growers + latest.layers + latest.broilers;
}

export function getDiseaseReports(): DiseaseReport[] {
  const data = localStorage.getItem(STORAGE_KEYS.diseaseReports);
  return data ? JSON.parse(data) : [];
}

export function addDiseaseReport(report: { description: string; photo?: string }) {
  const reports = getDiseaseReports();
  reports.unshift({
    ...report,
    id: crypto.randomUUID(),
    reportedAt: new Date().toISOString(),
    status: "Pending",
  });
  localStorage.setItem(STORAGE_KEYS.diseaseReports, JSON.stringify(reports));
}

// Mock vaccination/deworming due dates
export function getVaccinationDaysLeft(): number {
  const stored = localStorage.getItem("vaccination_next_due");
  if (!stored) {
    // default: 10 days from now
    const d = new Date();
    d.setDate(d.getDate() + 10);
    localStorage.setItem("vaccination_next_due", d.toISOString());
    return 10;
  }
  const diff = Math.ceil((new Date(stored).getTime() - Date.now()) / 86400000);
  return diff;
}

export function getDewormingDaysLeft(): number {
  const stored = localStorage.getItem("deworming_next_due");
  if (!stored) {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    localStorage.setItem("deworming_next_due", d.toISOString());
    return 20;
  }
  const diff = Math.ceil((new Date(stored).getTime() - Date.now()) / 86400000);
  return diff;
}

export function getNotifications(): Notification[] {
  return [
    {
      id: "1",
      type: "disease",
      message: "Newcastle disease alert in Vadugapattu area. Keep birds isolated.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "2",
      type: "market",
      message: "Egg price increased to ₹6.50/egg at Villupuram market.",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "3",
      type: "tip",
      message: "Add turmeric powder to feed water to improve bird immunity during monsoon.",
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  // Missing/invalid dates render as "—" rather than "NaN/NaN/NaN".
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
