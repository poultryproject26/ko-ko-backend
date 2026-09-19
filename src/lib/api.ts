const BASE = "https://ko-ko-backend.onrender.com/api";

function getToken() {
  return localStorage.getItem("token") || "";
}

async function request(method: string, path: string, body?: object, auth = true) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${getToken()}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const api = {
  // Auth
  sendOtp: (phone: string) => request("POST", "/auth/send-otp", { phone }, false),
  verifyOtp: (phone: string, otp: string) => request("POST", "/auth/verify-otp", { phone, otp }, false),
  register: (data: { phone: string; name: string; hamlet: string; street: string; houseNo: string; shg_name: string }) =>
    request("POST", "/auth/register", data, false),

  // Bird Updates
  getBirdUpdates: () => request("GET", "/birds"),
  checkWeekSubmitted: () => request("GET", "/birds/check-week"),
  submitBirdUpdate: (body: { chicks: number; growers: number; layers: number; broilers: number }) =>
    request("POST", "/birds", body),
  getAllBirdUpdates: () => request("GET", "/birds/all"),

  // Vaccination Stock
  getVaccinationStockUpdates: () => request("GET", "/vaccination-stock"),
  checkVaccinationStockSubmitted: () => request("GET", "/vaccination-stock/check"),
  submitVaccinationStock: (body: {
    chicksUnder1Week: number;
    chicks2to3Weeks: number;
    chicks4to5Weeks: number;
    chicks6to7Weeks: number;
    chicks8to9Weeks: number;
    chicks10to11Weeks: number;
    chicks12to13Weeks: number;
    birds4Months: number;
    birds5Months: number;
  }) => request("POST", "/vaccination-stock", body),

  // Vaccinations
  getVaccinations: () => request("GET", "/vaccinations"),
  getAllVaccinations: () => request("GET", "/vaccinations/all"),
  getMySchedule: () => request("GET", "/vaccinations/schedule/me"),
  getFarmerSchedule: (farmerId: string) => request("GET", `/vaccinations/schedule/${farmerId}`),
  // Batch management
  getMyBatches: () => request("GET", "/vaccinations/batches/me"),
  getFarmerBatches: (farmerId: string) => request("GET", `/vaccinations/batches/farmer/${farmerId}`),
  getAllBatches: () => request("GET", "/vaccinations/batches/all"),
  createBatch: (body: { userId: string; batchName: string; numberOfChicks: number; batchDate: string }) => request("POST", "/vaccinations/batches", body),
  updateBatchStatus: (batchId: string, batchStatus: string) => request("PATCH", `/vaccinations/batches/${batchId}/status`, { batchStatus }),
  deleteBatch: (batchId: string) => request("DELETE", `/vaccinations/batches/${batchId}`),
  // Vaccination actions
  completeVaccination: (id: string, notes?: string) => request("PATCH", `/vaccinations/${id}/complete`, { notes }),
  missVaccination: (id: string, notes?: string) => request("PATCH", `/vaccinations/${id}/missed`, { notes }),
  rescheduleVaccination: (id: string, rescheduledDate: string, notes?: string) => request("PATCH", `/vaccinations/${id}/reschedule`, { rescheduledDate, notes }),

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
  setMarketPrice: (body: { broiler: number; chick: number; egg: number }, officer?: any) => request("POST", "/market", body),

  // Notifications
  getNotifications: (read?: boolean) => request("GET", read === undefined ? "/notifications" : `/notifications?read=${read}`),
  createNotification: (body: { type: string; message: string; hamlet?: string; shg_name?: string; shg_names?: string[] }) =>
    request("POST", "/notifications", body),
  deleteNotification: (id: string) => request("DELETE", `/notifications/${id}`),
  registerDeviceToken: (token: string, platform: string) => request("POST", "/notifications/register-token", { token, platform }),
  unregisterDeviceToken: (token: string) => request("DELETE", "/notifications/unregister-token", { token }),
  markNotificationRead: (id: string) => request("PATCH", `/notifications/${id}/read`),
  markAllNotificationsRead: () => request("PATCH", "/notifications/mark-all-read"),

  // Farmers (CRP)
  getFarmers: () => request("GET", "/farmers"),
  getPendingFarmers: () => request("GET", "/farmers?approved=false"),
  approveFarmer: (id: string) => request("PATCH", `/farmers/${id}/approve`),
  rejectFarmer: (id: string) => request("DELETE", `/farmers/${id}/reject`),
  deleteFarmer: (id: string) => request("DELETE", `/farmers/${id}`),

  // SHG Groups
  getShgGroups: () => request("GET", "/shg", undefined, false),
  addShgGroup: (name: string) => request("POST", "/shg", { name }),
  deleteShgGroup: (id: string) => request("DELETE", `/shg/${id}`),

  // Sale Stocks
  getSaleStocks: () => request("GET", "/sale-stocks", undefined, false),
  submitSaleStock: (body: { broilers: number; chicks: number; eggs: number }) =>
    request("POST", "/sale-stocks", body),
  markSold: (id: string) => request("PATCH", `/sale-stocks/${id}/sold`),

  // Vaccination Stock
  getVaccinationStock: () => request("GET", "/vaccination-stock"),
  submitVaccinationStock: (body: { week0?: number; week2?: number; week4?: number; week6?: number; week8?: number; week10?: number; week12?: number; month4?: number; month5?: number }) =>
    request("POST", "/vaccination-stock", body),

  // Activity Feed
  getActivity: () => request("GET", "/activity"),
};
