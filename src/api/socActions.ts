const API_URL = import.meta.env.VITE_API_URL;

function authHeaders() {
  return {
    Authorization: "Bearer " + localStorage.getItem("access_token"),
    "Content-Type": "application/json",
  };
}

// =====================================================
// SOC ACTIONS (EXISTING — НЕ ТРОГАЕМ)
// =====================================================

export async function blockUser(user: string) {
  const res = await fetch(`${API_URL}/soc/actions/block-user`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ user }),
  });

  if (!res.ok) throw new Error("BLOCK_FAILED");
  return res.json();
}

export async function isolateSession(user: string) {
  const res = await fetch(`${API_URL}/soc/actions/isolate-session`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ user }),
  });

  if (!res.ok) throw new Error("ISOLATE_FAILED");
  return res.json();
}

// =====================================================
// SOC EXPORTS (NEW — ONLY EXTENSION)
// =====================================================

/**
 * CSV export for reports / Excel
 */
export async function exportSocCsv() {
  const res = await fetch(`${API_URL}/soc/export/csv`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
    },
  });

  if (!res.ok) {
    throw new Error("CSV_EXPORT_FAILED");
  }

  const blob = await res.blob();
  downloadFile(blob, "soc_export.csv");
}

/**
 * SIEM export (JSON, SIEM-ready)
 * Splunk / QRadar / Sentinel compatible
 */
export async function exportSocSiemJson() {
  const res = await fetch(`${API_URL}/soc/export/siem`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
    },
  });

  if (!res.ok) {
    throw new Error("SIEM_EXPORT_FAILED");
  }

  const data = await res.json();

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  downloadFile(blob, "soc_export_siem.json");
}

// =====================================================
// HELPERS (SAFE, LOCAL)
// =====================================================

function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);

  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}
