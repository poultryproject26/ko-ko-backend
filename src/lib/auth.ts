export interface User {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  hamlet: string;
  shgName: string;
  shg_name: string;
  role: string;
  approved?: boolean;
  houseNo?: string;
  street?: string;
  hamletId?: string;
  streetId?: string;
}

export function getToken(): string {
  return localStorage.getItem("token") || "";
}

export function getUser(): User | null {
  const data = localStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}

export function setUser(user: User, token: string) {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", token);
}

export function clearUser() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}
