import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";

// Duplicated from CrpReportsTab.tsx (kept in sync manually, not imported —
// that file is not to be modified) so Admin Reports gets the same
// Excel/PDF/native-share behavior without touching CRP report code.

// Android's WebView doesn't support the Blob + <a download> convention that
// XLSX.writeFile()/pdf.save() rely on, so on native platforms we write the
// generated file to the app cache and hand it to the OS share sheet instead.
export async function saveAndShareNative(base64Data: string, filename: string) {
  let fileUri: string;
  try {
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });
    fileUri = result.uri;
  } catch (error) {
    console.error("[Report] Unable to save report file:", error);
    toast.error("Unable to save the report. Please try again.");
    return;
  }

  try {
    await Share.share({ title: filename, url: fileUri });
  } catch (error: any) {
    // User dismissing the share sheet rejects the promise with "Share canceled" — not an error.
    if (error?.message !== "Share canceled") {
      console.error("[Report] Unable to share report file:", error);
      toast.error("Unable to share the report. Please try again.");
    }
  }
}

export function downloadExcel(headers: string[], rows: (string | number)[][], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    void saveAndShareNative(base64, `${filename}.xlsx`);
    return;
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function downloadPDF(title: string, headers: string[], rows: (string | number)[][], filename: string) {
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

  if (Capacitor.isNativePlatform()) {
    const base64 = pdf.output("datauristring").split(",")[1] ?? "";
    await saveAndShareNative(base64, `${filename}.pdf`);
    return;
  }

  pdf.save(`${filename}.pdf`);
}

// Safe numeric coercion for totals — missing/null/non-numeric values contribute 0.
export function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
