export type SeverityCode = 0 | 1;

export interface SeverityInfo {
  code: SeverityCode;
  label: string;
  shortLabel: string;
  colorHex: string;
  bgHex: string;
  description: string;
}

const SEVERITY_MAP: Record<SeverityCode, SeverityInfo> = {
  0: {
    code: 0,
    label: "Mild Severity",
    shortLabel: "Mild",
    colorHex: "#059669",
    bgHex: "#d1fae5",
    description:
      "Indicators consistent with DSM-5 Level 2: requires substantial support.",
  },
  1: {
    code: 1,
    label: "High Severity",
    shortLabel: "Severe",
    colorHex: "#dc2626",
    bgHex: "#fee2e2",
    description:
      "Indicators consistent with DSM-5 Level 3: requires very substantial support.",
  },
};

export function mapSeverity(value: unknown): SeverityInfo {
  const code = normaliseSeverityCode(value);
  return SEVERITY_MAP[code];
}

export function normaliseSeverityCode(value: unknown): SeverityCode {
  if (value === 1 || value === "1" || value === true) return 1;
  if (value === 0 || value === "0" || value === false) return 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "severe" || v === "high" || v === "high severity") return 1;
    if (v === "mild" || v === "low" || v === "mild severity") return 0;
  }
  return 0;
}

export function severityLabel(value: unknown): string {
  return mapSeverity(value).label;
}
