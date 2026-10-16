import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/mockData";
import { Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

function downloadExcel(headers: string[], rows: (string | number)[][], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

async function downloadPDF(title: string, headers: string[], rows: (string | number)[][], filename: string) {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;background:#fff;padding:16px;font-family:sans-serif;width:900px";

  const titleEl = document.createElement("h2");
  titleEl.style.cssText = "font-size:16px;font-weight:bold;margin-bottom:12px;color:#111";
  titleEl.textContent = title;
  container.appendChild(titleEl);

  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;font-size:12px";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.style.cssText = "background:#e5e7eb;padding:6px 8px;text-align:left;border:1px solid #d1d5db;font-weight:600;color:#111";
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.style.background = i % 2 === 0 ? "#fff" : "#f9fafb";
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.style.cssText = "padding:5px 8px;border:1px solid #e5e7eb;color:#111";
      td.textContent = String(cell ?? "-");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`${filename}.pdf`);
}

function ExportButtons({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => Promise<void> }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const handlePdf = async () => { setLoading(true); await onPdf(); setLoading(false); };
  return (
    <div className="flex gap-2 mt-3">
      <Button size="sm" onClick={onExcel} className="gap-1 bg-success text-success-foreground flex-1">
        <Download size={13} /> Excel
      </Button>
      <Button size="sm" onClick={handlePdf} disabled={loading} variant="outline" className="gap-1 flex-1">
        <FileText size={13} /> {loading ? t("generatingPdf") : "PDF"}
      </Button>
    </div>
  );
}

function Section({ title, count, defaultOpen = true, children, onExcel, onPdf }: {
  title: string; count?: number; defaultOpen?: boolean;
  children: React.ReactNode; onExcel: () => void; onPdf: () => Promise<void>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-4 bg-card">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {count !== undefined && <Badge className="bg-muted text-muted-foreground text-xs">{count}</Badge>}
        </div>
        {open ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
      <ExportButtons onExcel={onExcel} onPdf={onPdf} />
    </Card>
  );
}

const CrpReportsTab = () => {
  const { t, lang } = useLanguage();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [diseaseReports, setDiseaseReports] = useState<any[]>([]);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [birdUpdates, setBirdUpdates] = useState<any[]>([]);
  const [saleStocks, setSaleStocks] = useState<any[]>([]);

  useEffect(() => {
    api.getFarmers().then(setFarmers).catch(() => {});
    api.getAllServiceDemands().then(setDemands).catch(() => {});
    api.getAllDiseaseReports().then(setDiseaseReports).catch(() => {});
    api.getAllVaccinations().then(setVaccinations).catch(() => {});
    api.getAllBirdUpdates().then(setBirdUpdates).catch(() => {});
    api.getSaleStocks().then(setSaleStocks).catch(() => {});
  }, []);

  const today = new Date();
  const farmerName = (item: any) => item.userId?.name || item.farmerName || item.name || "-";
  const farmerPhone = (item: any) => item.userId?.phone || item.phone || "-";
  const farmerShg = (item: any) => item.userId?.shg_name || item.shg_name || "-";
  const farmerAddress = (item: any) => {
    const user = item.userId || item;
    return [user.houseNo, user.street, user.hamlet || item.hamlet].filter(Boolean).join(", ") || "-";
  };
  const farmerInfoHeadersEn = ["Farmer", "SHG Name", "Address", "Contact No"];
  const farmerInfoHeadersTamil = ["விவசாயி", "SHG பெயர்", "முகவரி", "தொடர்பு எண்"];
  const farmerInfoHeaders = lang === "en" ? farmerInfoHeadersEn : farmerInfoHeadersTamil;
  const farmerInfoCells = (item: any): (string | number)[] => [
    farmerName(item),
    farmerShg(item),
    farmerAddress(item),
    farmerPhone(item),
  ];

  const farmerRows: (string | number)[][] = farmers.map((f) => farmerInfoCells(f));
  const farmerHeadersTamil = farmerInfoHeadersTamil;
  const farmerHeadersEn = farmerInfoHeadersEn;
  const farmerHeaders = lang === "en" ? farmerHeadersEn : farmerHeadersTamil;

  const demandTypes = ["Loan", "Feed Stock", "Equipment", "Vaccination", "Deworming"];
  const demandRows: (string | number)[][] = demandTypes.map((type) => {
    const all = demands.filter((d) => d.type === type);
    return [type, all.length, all.filter((d) => d.status === "Pending").length, all.filter((d) => d.status === "Completed").length, all.filter((d) => d.status === "Rejected").length];
  });
  const demandHeadersTamil = ["வகை", "மொத்தம்", "நிலுவை", "நிறைவு", "நிராகரிப்பு"];
  const demandHeadersEn = ["Type", "Total", "Pending", "Completed", "Rejected"];
  const demandHeaders = lang === "en" ? demandHeadersEn : demandHeadersTamil;

  const pendingDisease = diseaseReports.filter((r) => r.status === "Pending");
  const diseaseRows: (string | number)[][] = diseaseReports.map((r) => [...farmerInfoCells(r), formatDate(r.reportedAt), r.description, r.status]);
  const diseaseHeadersTamil = [...farmerInfoHeadersTamil, "தேதி", "விவரம்", "நிலை"];
  const diseaseHeadersEn = [...farmerInfoHeadersEn, "Date", "Description", "Status"];
  const diseaseHeaders = lang === "en" ? diseaseHeadersEn : diseaseHeadersTamil;

  const overdueVax = vaccinations.filter((v) => v.type !== "deworming" && new Date(v.nextDueDate) < today);
  const overdueDew = vaccinations.filter((v) => v.type === "deworming" && new Date(v.nextDueDate) < today);
  const vacRows: (string | number)[][] = vaccinations.map((v) => [
    ...farmerInfoCells(v),
    v.type === "deworming"
      ? (lang === "en" ? "Deworming" : "குடற்புழு நீக்கம்")
      : v.type === "smallpox"
      ? (lang === "en" ? "Smallpox" : "அம்மை தடுப்பூசி")
      : (lang === "en" ? "Ranikhet (RD)" : "வெள்ளை கழிச்சல்"),
    formatDate(v.dateGiven), formatDate(v.nextDueDate),
    new Date(v.nextDueDate) < today
      ? (lang === "en" ? "Overdue" : "காலாவதி")
      : (lang === "en" ? "OK" : "சரி"),
  ]);
  const vacHeadersTamil = [...farmerInfoHeadersTamil, "வகை", "கடைசி தேதி", "அடுத்த தேதி", "நிலை"];
  const vacHeadersEn = [...farmerInfoHeadersEn, "Type", "Last Date", "Next Date", "Status"];
  const vacHeaders = lang === "en" ? vacHeadersEn : vacHeadersTamil;

  const weeklyRows: (string | number)[][] = birdUpdates.map((u) => [
    ...farmerInfoCells(u), formatDate(u.weekDate), u.chicks, u.growers, u.layers, u.broilers,
    u.chicks + u.growers + u.layers + u.broilers,
  ]);
  const weeklyHeadersTamil = [...farmerInfoHeadersTamil, "வாரம்", "குஞ்சு", "வளர்ச்சி", "முட்டை", "கறி", "மொத்தம்"];
  const weeklyHeadersEn = [...farmerInfoHeadersEn, "Week", "Chick", "Growers", "Eggs", "Broilers", "Total"];
  const weeklyHeaders = lang === "en" ? weeklyHeadersEn : weeklyHeadersTamil;

  const loans = demands.filter((d) => d.type === "Loan");
  const totalRequested = loans.reduce((s, d) => s + (d.amount || 0), 0);
  const totalApproved  = loans.filter((d) => d.status === "Completed").reduce((s, d) => s + (d.amount || 0), 0);
  const totalRejected  = loans.filter((d) => d.status === "Rejected").reduce((s, d) => s + (d.amount || 0), 0);
  const totalPending   = loans.filter((d) => d.status === "Pending").reduce((s, d) => s + (d.amount || 0), 0);
  const loanRows: (string | number)[][] = loans.map((d) => [...farmerInfoCells(d), d.amount || 0, d.notes || "-", d.status, formatDate(d.createdAt)]);
  const loanHeadersTamil = [...farmerInfoHeadersTamil, "தொகை", "நோக்கம்", "நிலை", "தேதி"];
  const loanHeadersEn = [...farmerInfoHeadersEn, "Amount", "Purpose", "Status", "Date"];
  const loanHeaders = lang === "en" ? loanHeadersEn : loanHeadersTamil;

  const soldStocks = saleStocks;
  const soldRows: (string | number)[][] = soldStocks.map((s) => [...farmerInfoCells(s), s.broilers, s.chicks, s.eggs, formatDate(s.createdAt), s.soldAt ? formatDate(s.soldAt) : "-", s.status === "sold" ? (lang === "en" ? "Sold" : "விற்பனையானது") : (lang === "en" ? "Ready for Sale" : "விற்பனைக்கு தயார்")]);
  const soldHeadersTamil = [...farmerInfoHeadersTamil, "கறிக்கோழி", "குஞ்சு", "முட்டை", "பதிவு தேதி", "விற்பனை தேதி", "நிலை"];
  const soldHeadersEn = [...farmerInfoHeadersEn, "Broiler Chicken", "Chick", "Egg", "Reg Date", "Sale Date", "Status"];
  const soldHeaders = lang === "en" ? soldHeadersEn : soldHeadersTamil;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-center text-foreground">{t("reportsTitle")}</h2>

      <Section title={t("farmerDataReport")} count={farmers.length} defaultOpen={false}
        onExcel={() => downloadExcel(farmerHeaders, farmerRows, "farmer_data")}
        onPdf={() => downloadPDF(t("farmerDataReport"), farmerHeaders, farmerRows, "farmer_data")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{farmerHeaders.map((h) => <th key={h} className="text-left py-2 px-1 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
            <tbody>{farmerRows.map((row, i) => (<tr key={i} className="border-b border-border/40">{row.map((cell, j) => <td key={j} className="py-2 px-1 text-foreground">{cell}</td>)}</tr>))}</tbody>
          </table>
        </div>
      </Section>

      <Section title={t("serviceDemandReport")} defaultOpen={true}
        onExcel={() => downloadExcel(demandHeaders, demandRows, "service_demands")}
        onPdf={() => downloadPDF(t("serviceDemandReport"), demandHeaders, demandRows, "service_demands")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{demandHeaders.map((h) => <th key={h} className="text-left py-2 px-1 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
            <tbody>{demandRows.map((row, i) => (<tr key={i} className="border-b border-border/40"><td className="py-2 px-1 font-medium text-foreground">{row[0]}</td><td className="py-2 px-1 text-center">{row[1]}</td><td className="py-2 px-1 text-center text-warning font-bold">{row[2]}</td><td className="py-2 px-1 text-center text-success font-bold">{row[3]}</td><td className="py-2 px-1 text-center text-danger font-bold">{row[4]}</td></tr>))}</tbody>
          </table>
        </div>
      </Section>

      <Section title={lang === "en" ? "Requested Farmers List" : "கோரிக்கையாளர் பட்டியல்"} defaultOpen={false}
        onExcel={() => {
          const listHeadersExcelTamil = ["வகை", "#", ...farmerInfoHeadersTamil, "தொகை/அளவு", "நிலை", "தேதி"];
          const listHeadersExcelEn = ["Type", "#", ...farmerInfoHeadersEn, "Amount/Qty", "Status", "Date"];
          const listHeadersExcel = lang === "en" ? listHeadersExcelEn : listHeadersExcelTamil;
          const allRows: (string | number)[][] = demandTypes.flatMap((type) =>
            demands.filter((d) => d.type === type).map((d, i) => [
              type, i + 1, ...farmerInfoCells(d),
              d.type === "Loan" ? `₹${(d.amount || 0).toLocaleString()}` : (d.quantity || "-"),
              d.status, formatDate(d.createdAt),
            ])
          );
          downloadExcel(listHeadersExcel, allRows, "demand_farmers_list");
        }}
        onPdf={async () => {
          const listHeadersTamil = ["#", ...farmerInfoHeadersTamil, "தொகை/அளவு", "நிலை", "தேதி"];
          const listHeadersEn = ["#", ...farmerInfoHeadersEn, "Amount/Qty", "Status", "Date"];
          const listHeaders = lang === "en" ? listHeadersEn : listHeadersTamil;
          for (const type of demandTypes) {
            const list = demands.filter((d) => d.type === type);
            if (list.length === 0) continue;
            const rows = list.map((d, i) => [
              i + 1, ...farmerInfoCells(d),
              type === "Loan" ? `Rs.${(d.amount || 0).toLocaleString()}` : (d.quantity || "-"),
              d.status, formatDate(d.createdAt),
            ]);
            const pdfTitle = lang === "en"
              ? `${type} Request List (${list.length} farmers)`
              : `${type} கோரிக்கையாளர் பட்டியல் (${list.length} பேர்)`;
            await downloadPDF(pdfTitle, listHeaders, rows, `${type}_farmers`);
          }
        }}>
        <div className="flex flex-col gap-4">
          {demandTypes.map((type) => {
            const list = demands.filter((d) => d.type === type);
            if (list.length === 0) return null;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-foreground">{type}</p>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    {lang === "en" ? `${list.length} farmers` : `${list.length} பேர்`}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-1.5 px-1 text-muted-foreground">#</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground">{lang === "en" ? "Name" : "பெயர்"}</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground">{lang === "en" ? "SHG Name" : "SHG பெயர்"}</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground">{lang === "en" ? "Address" : "முகவரி"}</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground">{lang === "en" ? "Contact No" : "தொடர்பு எண்"}</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground">{lang === "en" ? "Amount/Qty" : "தொகை/அளவு"}</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground">{lang === "en" ? "Status" : "நிலை"}</th>
                    </tr></thead>
                    <tbody>
                      {list.map((d, i) => (
                        <tr key={d._id} className="border-b border-border/40">
                          <td className="py-1.5 px-1 text-muted-foreground">{i + 1}</td>
                          <td className="py-1.5 px-1 font-medium text-foreground">{farmerName(d)}</td>
                          <td className="py-1.5 px-1 text-foreground">{farmerShg(d)}</td>
                          <td className="py-1.5 px-1 text-foreground">{farmerAddress(d)}</td>
                          <td className="py-1.5 px-1 text-foreground">{farmerPhone(d)}</td>
                          <td className="py-1.5 px-1 text-foreground">{type === "Loan" ? `₹${(d.amount || 0).toLocaleString()}` : (d.quantity || "-")}</td>
                          <td className="py-1.5 px-1">
                            <span className={`font-semibold ${
                              d.status === "Completed" ? "text-success" :
                              d.status === "Rejected" ? "text-danger" : "text-warning"
                            }`}>{d.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={t("diseaseReportLog")} count={pendingDisease.length} defaultOpen={true}
        onExcel={() => downloadExcel(diseaseHeaders, diseaseRows, "disease_reports")}
        onPdf={() => downloadPDF(t("diseaseReportLog"), diseaseHeaders, diseaseRows, "disease_reports")}>
        <div className="flex flex-col gap-2">
          {diseaseReports.slice(0, 20).map((r, i) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{r.userId?.name || "-"} • {formatDate(r.reportedAt)}</p>
                <Badge className={r.status === "Reviewed" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                  {r.status === "Reviewed" ? (lang === "en" ? "Reviewed" : "பரிசீலிக்கப்பட்டது") : (lang === "en" ? "Pending" : "நிலுவையில்")}
                </Badge>
              </div>
              <p className="text-sm text-foreground">{r.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("vaccinationStatusReport")} count={overdueVax.length + overdueDew.length} defaultOpen={false}
        onExcel={() => downloadExcel(vacHeaders, vacRows, "vaccination_status")}
        onPdf={() => downloadPDF(t("vaccinationStatusReport"), vacHeaders, vacRows, "vaccination_status")}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-danger/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-danger">{overdueVax.length}</p>
            <p className="text-xs text-muted-foreground">{lang === "en" ? "Vaccination Overdue" : "தடுப்பூசி காலாவதி"}</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-warning">{overdueDew.length}</p>
            <p className="text-xs text-muted-foreground">{lang === "en" ? "Deworming Overdue" : "குடற்புழு காலாவதி"}</p>
          </div>
        </div>
      </Section>

      <Section title={t("weeklyHistoryReport")} defaultOpen={false}
        onExcel={() => downloadExcel(weeklyHeaders, weeklyRows, "weekly_history")}
        onPdf={() => downloadPDF(t("weeklyHistoryReport"), weeklyHeaders, weeklyRows, "weekly_history")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{weeklyHeaders.map((h) => <th key={h} className="text-left py-2 px-1 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
            <tbody>{weeklyRows.map((row, i) => (<tr key={i} className="border-b border-border/40">{row.map((cell, j) => <td key={j} className={`py-2 px-1 ${j === 9 ? "font-bold text-primary" : "text-foreground"}`}>{cell}</td>)}</tr>))}</tbody>
          </table>
        </div>
      </Section>

      <Section title={t("loanSummaryReport")} count={loans.length} defaultOpen={false}
        onExcel={() => downloadExcel(loanHeaders, loanRows, "loan_summary")}
        onPdf={() => downloadPDF(t("loanSummaryReport"), loanHeaders, loanRows, "loan_summary")}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">₹{totalRequested.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t("totalRequest")}</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-warning">₹{totalPending.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{lang === "en" ? "Pending" : "நிலுவையில்"}</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-success">₹{totalApproved.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t("approved")}</p>
          </div>
          <div className="bg-danger/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-danger">₹{totalRejected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t("rejected")}</p>
          </div>
        </div>
      </Section>

      <Section title={t("saleStockHistoryReport")} count={soldStocks.length} defaultOpen={false}
        onExcel={() => downloadExcel(soldHeaders, soldRows, "sold_stocks")}
        onPdf={() => downloadPDF(t("saleStockHistoryReport"), soldHeaders, soldRows, "sold_stocks")}>
        {soldStocks.length === 0 ? <p className="text-sm text-muted-foreground">{t("noDataFound")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border">{soldHeaders.map((h) => <th key={h} className="text-left py-2 px-1 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
              <tbody>{soldStocks.map((s, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-2 px-1 text-foreground">{farmerName(s)}</td>
                  <td className="py-2 px-1 text-foreground">{farmerShg(s)}</td>
                  <td className="py-2 px-1 text-foreground">{farmerAddress(s)}</td>
                  <td className="py-2 px-1 text-foreground">{farmerPhone(s)}</td>
                  <td className="py-2 px-1 text-foreground">{s.broilers}</td>
                  <td className="py-2 px-1 text-foreground">{s.chicks}</td>
                  <td className="py-2 px-1 text-foreground">{s.eggs}</td>
                  <td className="py-2 px-1 text-foreground">{formatDate(s.createdAt)}</td>
                  <td className="py-2 px-1 text-foreground">{s.soldAt ? formatDate(s.soldAt) : "-"}</td>
                  <td className="py-2 px-1">
                    <span className={`font-bold ${s.status === "sold" ? "text-success" : "text-primary"}`}>
                      {s.status === "sold"
                        ? (lang === "en" ? "Sold" : "விற்பனையானது")
                        : (lang === "en" ? "Ready for Sale" : "விற்பனைக்கு தயார்")}
                    </span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
};

export default CrpReportsTab;
