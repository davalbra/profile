import type { BillingPeriodKey } from "@/lib/billing/types";

export const opcionesPeriodoFacturacion: Array<{ value: BillingPeriodKey; label: string }> = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
];
