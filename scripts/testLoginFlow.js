const BASE = "https://ko-ko-backend.onrender.com/api";

const accounts = [
  { role: "Farmer", phone: "9876500001", pin: "1234" },
  { role: "CRP",    phone: "9876500002", pin: "1234" },
  { role: "Admin",  phone: "9876500003", pin: "1234" },
];

async function callApi(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, rawText: text.slice(0, 150) };
  }
}

async function testAll() {
  console.log(`Testing against backend API: ${BASE}\n`);

  for (const acc of accounts) {
    console.log(`--- Testing [${acc.role}] (${acc.phone}) ---`);
    
    // 1. Check password status
    const status = await callApi("/auth/password-status", { phone: acc.phone });
    console.log(`1. Password status (${status.status}):`, status.data || status.rawText);

    // 2. Perform login
    const login = await callApi("/auth/login", { phone: acc.phone, password: acc.pin });
    if (login.ok) {
      console.log(`2. Login SUCCESS: User "${login.data.user.name}" (Role: ${login.data.user.role})`);
      console.log(`   Token prefix: ${login.data.token.slice(0, 25)}...`);
    } else {
      console.error(`2. Login FAILED (${login.status}):`, login.data || login.rawText);
    }
    console.log();
  }
}

testAll().catch(console.error);
