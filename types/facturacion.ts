import type {
  BillingPeriodKey,
  BillingServiceKey,
  BillingUsageData,
} from "@/lib/billing/types"

export interface ConsultaFacturacionUso {
  servicio: BillingServiceKey
  periodo: BillingPeriodKey
}

export interface RespuestaFacturacionUso {
  ok: boolean
  data: BillingUsageData
}
