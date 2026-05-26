const SCHEDULE = [
  { day: 14,  type: "F_vaccine",  label: "F Vaccine" },
  { day: 28,  type: "IBD",        label: "IBD Vaccine" },
  { day: 42,  type: "LaSota",     label: "LaSota Vaccine" },
  { day: 56,  type: "fowl_pox",   label: "Fowl Pox Vaccine" },
  { day: 70,  type: "deworming",  label: "Deworming" },
  { day: 84,  type: "R2B",        label: "R2B + Deworming" },
];

const BOOSTER_INTERVAL_DAYS = 120; // 4 months

export function generateSchedule(batchDate, boosterCount = 3) {
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

export function getNotificationMessages(event, daysUntil) {
  const dateStr = formatDate(event.scheduledDate);
  const isR2B = event.type === "R2B" || event.type === "R2B_booster";

  if (!isR2B) {
    if (daysUntil === 3) return [`Prepare vaccine on ${dateStr}`];
    return [];
  }

  const dewormDate = new Date(event.scheduledDate);
  dewormDate.setDate(dewormDate.getDate() - 1);
  const dewormStr = formatDate(dewormDate);

  if (daysUntil === 3) {
    return [
      `Vaccinate on ${dateStr}`,
      `Prepare for deworming tomorrow (${dewormStr})`,
    ];
  }
  if (daysUntil === 2) {
    return [
      `Deworm today`,
      `Prepare R2B vaccination for ${dateStr}`,
    ];
  }
  return [];
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
