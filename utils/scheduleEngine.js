const SCHEDULE = [
  { day: 14,  type: "F_vaccine",  label: "F Vaccine" },
  { day: 28,  type: "IBD",        label: "IBD Vaccine" },
  { day: 42,  type: "LaSota",     label: "LaSota Vaccine" },
  { day: 56,  type: "fowl_pox",   label: "Fowl Pox Vaccine" },
  { day: 70,  type: "deworming",  label: "Deworming" },
  { day: 84,  type: "R2B",        label: "R2B + Deworming" },
];

const BOOSTER_INTERVAL_DAYS = 120; // 4 months

export function generateSchedule(batchDate, boosterCount = 20) {
  const base = new Date(batchDate);
  base.setHours(0, 0, 0, 0);

  const events = SCHEDULE.map(({ day, type, label }) => {
    const d = new Date(base);
    d.setDate(d.getDate() + day);
    return { type, label, scheduledDate: new Date(d), dayOffset: day, isBooster: false };
  });

  const firstR2B = new Date(base);
  firstR2B.setDate(firstR2B.getDate() + 84);

  for (let i = 1; i <= boosterCount; i++) {
    const d = new Date(firstR2B);
    d.setDate(d.getDate() + BOOSTER_INTERVAL_DAYS * i);
    events.push({
      type: "R2B_booster",
      label: `R2B Booster #${i} + Deworming`,
      scheduledDate: new Date(d),
      dayOffset: 84 + BOOSTER_INTERVAL_DAYS * i,
      isBooster: true,
    });
  }

  return events;
}

export function getNotificationType(eventType, daysUntil) {
  if (eventType === "R2B") {
    if (daysUntil === 2) return "deworming_reminder";
    return "r2b_reminder";
  }
  if (eventType === "R2B_booster") {
    if (daysUntil === 2) return "deworming_reminder";
    return "booster_reminder";
  }
  return "vaccination_reminder";
}

export function getNotificationTitle(eventType, daysUntil) {
  const dateStr = formatDate(eventType === "R2B" || eventType === "R2B_booster" ? addDays(new Date(), 0) : new Date());

  if (eventType === "R2B") return "R2B Vaccination Reminder";
  if (eventType === "R2B_booster") return "Booster Vaccination Reminder";
  if (eventType === "deworming") return "Deworming Reminder";
  return "Vaccination Reminder";
}

export function getNotificationMessage(event, daysUntil) {
  const dateStr = formatDate(event.scheduledDate);
  const isR2B = event.type === "R2B" || event.type === "R2B_booster";

  if (event.type === "R2B" || event.type === "R2B_booster") {
    const dewormDate = addDays(event.scheduledDate, -2);
    const dewormStr = formatDate(dewormDate);

    if (daysUntil === 3) {
      return `Vaccinate on ${dateStr}. Prepare for deworming on ${dewormStr}.`;
    }
    if (daysUntil === 2) {
      return `Deworm on ${dewormStr} and prepare for vaccination on ${dateStr}.`;
    }
    if (daysUntil === 0) {
      return `Today is vaccination day (${dateStr}). Please vaccinate the flock.`;
    }
    return "";
  }

  if (daysUntil === 3) {
    return `Vaccination scheduled for ${dateStr}. Please prepare.`;
  }

  return "";
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
