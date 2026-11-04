import { clearUser } from "./auth";

const BASE = "https://ko-ko-backend.onrender.com/api";
// const BASE = "http://localhost:3000/api";

export interface CrpRef {
  _id: string;
  name: string;
  phone?: string;
  designation?: string;
}

export interface Hamlet {
  _id: string;
  name: string;
  nameTa: string;
  nameEn: string;
  crpId: CrpRef | string | null;
  createdAt?: string;
}

export interface Crp {
  _id: string;
  name: string;
  phone: string;
  designation?: string;
  assignedLocation?: string;
  status?: "Active" | "Inactive";
  assignedHamlets?: Array<{ _id: string; name: string }> | string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Street {
  _id: string;
  name: string;
  nameTa: string;
  nameEn: string;
  hamletId: string | { _id: string; name?: string; crpId?: string | null };
  createdAt?: string;
}

interface HamletRef {
  _id: string;
  name?: string;
  nameTa?: string;
  nameEn?: string;
}

export interface AdminOverview {
  totalCrps: number;
  totalFarmers: number;
  totalHamlets: number;
  // Estimate only — see getAdminOverview() below for why this can't be exact.
  totalActiveBirds: number;
}

export interface Farmer {
  _id: string;
  name: string;
  phone: string;
  hamlet?: string;
  street?: string;
  houseNo?: string;
  shg_name?: string;
  approved?: boolean;
  hamletId?: HamletRef | string | null;
  streetId?: HamletRef | string | null;
  crpId?: CrpRef | string | null;
  created_at?: string;
}

// Admin Reports — every report row populates userId with the farmer's legacy
// `hamlet` string snapshot AND the canonical hamletId (nameTa/nameEn), so
// hamlet-wise grouping can prefer the canonical hamlet and fall back to an
// "Unresolved" bucket when hamletId is null.
export interface AdminReportFarmerRef {
  _id: string;
  name?: string;
  phone?: string;
  hamlet?: string;
  street?: string;
  houseNo?: string;
  shg_name?: string;
  hamletId?: HamletRef | null;
}

export interface AdminBirdBatchRow {
  _id: string;
  batchName?: string;
  numberOfChicks?: number;
  activeBirdCount?: number;
  mortalityCount?: number;
  batchStatus?: "active" | "inactive";
  batchDate?: string;
  createdAt?: string;
  userId: AdminReportFarmerRef | string | null;
}

export interface AdminBirdUpdateRow {
  _id: string;
  weekDate: string;
  chicks?: number;
  growers?: number;
  layers?: number;
  broilers?: number;
  createdAt?: string;
  userId: AdminReportFarmerRef | string | null;
}

export interface AdminSaleStockRow {
  _id: string;
  broilers?: number;
  chicks?: number;
  eggs?: number;
  hamlet?: string;  // denormalized at creation time; used when userId is null (farmer deleted)
  status: "available" | "sold";
  createdAt?: string;
  soldAt?: string;
  userId: AdminReportFarmerRef | string | null;
}

export interface AdminVaccinationStockRow {
  _id: string;
  withinMonth?: number;
  month2?: number;
  month3?: number;
  month4Plus?: number;
  status: "pending" | "completed";
  entryDate?: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  updatedAt?: string;
  userId: AdminReportFarmerRef | string | null;
}

export interface AdminServiceDemandRow {
  _id: string;
  type: string;
  option?: string;
  quantity?: number;
  amount?: number;
  notes?: string;
  status: "Pending" | "Completed" | "Rejected";
  createdAt?: string;
  userId: AdminReportFarmerRef | string | null;
}

export interface AdminDiseaseReportRow {
  _id: string;
  description: string;
  status: "Pending" | "Reviewed";
  reportedAt?: string;
  userId: AdminReportFarmerRef | string | null;
}

export type AdminAnnouncementAudience = "crp" | "farmer" | "both";

export interface AdminAnnouncementResult {
  success: boolean;
  audience: AdminAnnouncementAudience;
  recipientCount: number;
  status?: "sent" | "failed" | "no_recipients" | "duplicate_suppressed";
  notificationId?: string | null;
}

function getToken() {
  return localStorage.getItem("token") || "";
}

// Set once a 401 has already triggered a session clear + reload, so a burst of
// concurrent authenticated calls that all 401 together (e.g. an admin screen's
// Promise.all of several endpoints) only clears/reloads once instead of racing.
let sessionExpiredHandled = false;

async function request(method: string, path: string, body?: object, auth = true) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${getToken()}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  // Render cold starts and proxy errors can answer with an HTML page instead of
  // JSON; parse defensively so callers get a readable error (and the 401
  // session handling below still runs) instead of a JSON SyntaxError.
  const parsed = await res.json().catch(() => undefined);
  if (parsed === undefined && res.ok) throw { message: "Invalid server response" };
  // A successful JSON `null` (e.g. GET /market with no price yet) is returned as-is.
  const data = res.ok ? parsed : (parsed ?? { message: `Server error (${res.status})` });
  if (!res.ok) {
    // A 401 on a call that carried our own token means that token is missing,
    // invalid, or (now that tokens expire server-side) expired — the stored
    // session is stale. Clear it and reload so the app's mount effect in
    // Index.tsx finds no stored user and falls back to the login screen,
    // instead of leaving whatever screen was open showing a generic fetch
    // error. Only `auth: true` calls qualify — login/register/send-otp/
    // verify-otp and other intentionally unauthenticated calls pass
    // `auth: false` and a 401 from those (e.g. a wrong password) is a normal
    // rejection, not a stale session, so it's left to the caller as before.
    // The getToken() check guards a race with a manual logout: if the user
    // already logged out before this response came back, the token is
    // already cleared and the app is already showing the login screen — a
    // reload here would just force a jarring blank-screen flash on top of it.
    if (auth && res.status === 401 && !sessionExpiredHandled && getToken()) {
      sessionExpiredHandled = true;
      clearUser();
      window.location.reload();
    }
    // Backend error shapes are inconsistent: most 400/404/409 routes respond
    // with { message }, generic catch-blocks respond with { error }. Normalize
    // so every caller's existing `err?.message` reliably gets the real backend
    // text either way, while keeping every other field (e.g. a 409's
    // streetCount/farmerCount) intact on the thrown object.
    throw { ...data, message: data?.message || data?.error || "Request failed" };
  }
  return data;
}

export const api = {
  // Auth
  sendOtp: (phone: string) => request("POST", "/auth/send-otp", { phone }, false),
  verifyOtp: (phone: string, otp: string) => request("POST", "/auth/verify-otp", { phone, otp }, false),
  getPasswordStatus: (phone: string): Promise<{ setupRequired: boolean }> =>
    request("POST", "/auth/password-status", { phone }, false),
  setupPassword: (phone: string, otp: string, password: string): Promise<{ success: boolean }> =>
    request("POST", "/auth/setup-password", { phone, otp, password }, false),
  register: (data: { phone: string; name: string; hamlet?: string; hamletId?: string; street?: string; streetId?: string; houseNo: string; shg_name: string }) =>
    request("POST", "/auth/register", data, false),
  login: (phone: string, password: string) => request("POST", "/auth/login", { phone, password }, false),

  // Admin — Overview. totalActiveBirds is a rough estimate: it sums
  // BirdBatch.activeBirdCount for batches still marked "active", but that field
  // is set once at batch creation and never decremented for mortality/sales.
  getAdminOverview: (): Promise<AdminOverview> => request("GET", "/admin/overview"),
  adminResetUserPassword: (userIdOrPhone: string, password: string): Promise<{ success: boolean; message?: string }> =>
    request("PATCH", `/admin/users/${userIdOrPhone}/password`, { password }),

  // Admin — Hamlets
  getHamlets: (): Promise<Hamlet[]> => request("GET", "/hamlets"),
  createHamlet: (nameTa: string, nameEn: string, crpId?: string | null): Promise<Hamlet> =>
    request("POST", "/hamlets", { nameTa, nameEn, crpId: crpId ?? null }),
  updateHamlet: (id: string, data: { nameTa?: string; nameEn?: string; crpId?: string | null }): Promise<Hamlet> =>
    request("PATCH", `/hamlets/${id}`, data),
  deleteHamlet: (id: string) => request("DELETE", `/hamlets/${id}`),

  // Admin — Streets (scoped to one hamlet at a time)
  getStreetsByHamlet: (hamletId: string): Promise<Street[]> => request("GET", `/streets?hamletId=${hamletId}`),

  // Public — streets for one hamlet (no admin/CRP role required). Used by the
  // Farmer profile editor; admin screens must keep using getStreetsByHamlet above.
  getHamletStreets: (hamletId: string): Promise<Street[]> => request("GET", `/hamlets/${hamletId}/streets`),
  createStreet: (hamletId: string, nameTa: string, nameEn: string): Promise<Street> =>
    request("POST", `/hamlets/${hamletId}/streets`, { nameTa, nameEn }),
  updateStreet: (streetId: string, data: { nameTa?: string; nameEn?: string }): Promise<Street> =>
    request("PATCH", `/hamlets/streets/${streetId}`, data),
  deleteStreet: (streetId: string) => request("DELETE", `/hamlets/streets/${streetId}`),

  // Admin — CRPs
  getCrps: (): Promise<Crp[]> => request("GET", "/crps"),
  createCrp: (data: {
    name: string; phone: string; designation?: string; assignedLocation?: string;
    assignedHamlets?: string[]; password?: string;
  }): Promise<Crp> => request("POST", "/crps", data),
  updateCrp: (id: string, data: {
    name?: string; phone?: string; designation?: string; assignedLocation?: string;
  }): Promise<Crp> => request("PATCH", `/crps/${id}`, data),
  updateCrpStatus: (id: string, status: "Active" | "Inactive"): Promise<Crp> =>
    request("PATCH", `/crps/${id}/status`, { status }),
  assignCrpHamlets: (id: string, hamletIds: string[]) =>
    request("PATCH", `/crps/${id}/hamlets`, { hamletIds }),
  deleteCrp: (id: string) => request("DELETE", `/crps/${id}`),

  // Admin — Farmers (list reuses the existing getFarmers()/approveFarmer()/
  // rejectFarmer()/deleteFarmer() wrappers below; these cover what's left)
  getUnresolvedFarmers: (): Promise<Farmer[]> => request("GET", "/farmers/unresolved"),
  assignFarmerLocation: (id: string, hamletId: string, streetId?: string | null): Promise<Farmer> =>
    request("PATCH", `/farmers/${id}/location`, { hamletId, streetId: streetId || undefined }),

  // Admin — Reports. bird-updates-latest returns one row per farmer (their
  // most recent weekly submission), not full history — see AdminReports.tsx.
  getAdminBirdBatches: (): Promise<AdminBirdBatchRow[]> => request("GET", "/admin/reports/bird-batches"),
  getAdminBirdUpdatesLatest: (): Promise<AdminBirdUpdateRow[]> => request("GET", "/admin/reports/bird-updates-latest"),
  getAdminSaleStock: (): Promise<AdminSaleStockRow[]> => request("GET", "/admin/reports/sale-stock"),
  getAdminVaccinationStock: (): Promise<AdminVaccinationStockRow[]> => request("GET", "/admin/reports/vaccination-stock"),
  getAdminServices: (): Promise<AdminServiceDemandRow[]> => request("GET", "/admin/reports/services"),
  getAdminDiseases: (): Promise<AdminDiseaseReportRow[]> => request("GET", "/admin/reports/diseases"),

  // Admin — Announcements
  sendAdminAnnouncement: (title: string | undefined, message: string, audience: AdminAnnouncementAudience): Promise<AdminAnnouncementResult> =>
    request("POST", "/admin/announcements", { title: title || undefined, message, audience }),

  // Bird Updates
  getBirdUpdates: () => request("GET", "/birds"),
  checkWeekSubmitted: () => request("GET", "/birds/check-week"),
  submitBirdUpdate: (body: { chicks: number; growers: number; layers: number; broilers: number }) =>
    request("POST", "/birds", body),
  getAllBirdUpdates: () => request("GET", "/birds/all"),

  // Vaccinations
  getVaccinations: () => request("GET", "/vaccinations"),
  getAllVaccinations: () => request("GET", "/vaccinations/all"),
  getMySchedule: () => request("GET", "/vaccinations/schedule/me"),
  getFarmerSchedule: (farmerId: string) => request("GET", `/vaccinations/schedule/${farmerId}`),
  getMyBatches: () => request("GET", "/vaccinations/batches/me"),
  getFarmerBatches: (farmerId: string) => request("GET", `/vaccinations/batches/farmer/${farmerId}`),
  getAllBatches: () => request("GET", "/vaccinations/batches/all"),
  createBatch: (body: { userId: string; batchName: string; numberOfChicks: number; batchDate: string }) =>
    request("POST", "/vaccinations/batches", body),
  updateBatchStatus: (batchId: string, batchStatus: string) =>
    request("PATCH", `/vaccinations/batches/${batchId}/status`, { batchStatus }),
  deleteBatch: (batchId: string) => request("DELETE", `/vaccinations/batches/${batchId}`),
  recordMortality: (batchId: string, count: number) =>
    request("PATCH", `/vaccinations/batches/${batchId}/mortality`, { count }),
  completeVaccination: (id: string, notes?: string) => request("PATCH", `/vaccinations/${id}/complete`, { notes }),
  missVaccination: (id: string, notes?: string) => request("PATCH", `/vaccinations/${id}/missed`, { notes }),
  rescheduleVaccination: (id: string, rescheduledDate: string, notes?: string) =>
    request("PATCH", `/vaccinations/${id}/reschedule`, { rescheduledDate, notes }),
  addVaccination: (body: { userId: string; type: string; ageGroup?: string; dateGiven: string; nextDueDate: string; status?: string }) =>
    request("POST", "/vaccinations", body),

  // Service Demands
  getServiceDemands: () => request("GET", "/services"),
  getAllServiceDemands: () => request("GET", "/services/all"),
  submitServiceDemand: (body: { type: string; quantity: number; amount?: number; notes?: string; option?: string }) =>
    request("POST", "/services", body),
  completeServiceDemand: (id: string) => request("PATCH", `/services/${id}/complete`),
  rejectServiceDemand: (id: string) => request("PATCH", `/services/${id}/reject`),

  // Disease Reports
  getDiseaseReports: () => request("GET", "/disease"),
  getAllDiseaseReports: () => request("GET", "/disease/all"),
  submitDiseaseReport: (body: { description: string; photo?: string }) => request("POST", "/disease", body),
  reviewDiseaseReport: (id: string) => request("PATCH", `/disease/${id}/review`),

  // Market Prices
  getMarketPrice: () => request("GET", "/market", undefined, false),
  setMarketPrice: (body: { broiler: number; chick: number; egg: number }) => request("POST", "/market", body),

  // Notifications
  getNotifications: (read?: boolean) =>
    request("GET", read === undefined ? "/notifications" : `/notifications?read=${read}`),
  createNotification: (body: { type: string; message: string; hamlet?: string; shg_name?: string; shg_names?: string[] }) =>
    request("POST", "/notifications", body),
  deleteNotification: (id: string) => request("DELETE", `/notifications/${id}`),
  registerDeviceToken: (token: string, platform: string) =>
    request("POST", "/notifications/register-token", { token, platform }),
  unregisterDeviceToken: (token: string) => request("DELETE", "/notifications/unregister-token", { token }),
  markNotificationRead: (id: string) => request("PATCH", `/notifications/${id}/read`),
  markAllNotificationsRead: () => request("PATCH", "/notifications/mark-all-read"),

  // Farmers (CRP + Admin)
  getFarmers: (): Promise<Farmer[]> => request("GET", "/farmers"),
  getPendingFarmers: () => request("GET", "/farmers?approved=false"),
  approveFarmer: (id: string) => request("PATCH", `/farmers/${id}/approve`),
  rejectFarmer: (id: string) => request("DELETE", `/farmers/${id}/reject`),
  deleteFarmer: (id: string) => request("DELETE", `/farmers/${id}`),

  // SHG Groups
  getShgGroups: () => request("GET", "/shg", undefined, false),
  addShgGroup: (name: string) => request("POST", "/shg", { name }),
  deleteShgGroup: (id: string) => request("DELETE", `/shg/${id}`),

  // Sale Stocks
  getSaleStocks: () => request("GET", "/sale-stocks"),
  submitSaleStock: (body: { broilers: number; chicks: number; eggs: number }) =>
    request("POST", "/sale-stocks", body),
  markSold: (id: string) => request("PATCH", `/sale-stocks/${id}/sold`),

  // Vaccination Stock
  getVaccinationStock: () => request("GET", "/vaccination-stock"),
  getAllVaccinationStock: () => request("GET", "/vaccination-stock/all"),
  submitVaccinationStock: (body: { withinMonth?: number; month2?: number; month3?: number; month4Plus?: number }) =>
    request("POST", "/vaccination-stock", body),
  completeVaccinationStock: (id: string) => request("PATCH", `/vaccination-stock/${id}/complete`),

  // Profile
  updateProfile: (body: { name?: string; houseNo?: string; hamletId?: string; streetId?: string }) =>
    request("PATCH", "/auth/profile", body),
  changePassword: (currentPassword: string, newPassword: string): Promise<{ success: boolean }> =>
    request("PATCH", "/auth/change-password", { currentPassword, newPassword }),

  // Activity Feed
  getActivity: () => request("GET", "/activity"),
};
