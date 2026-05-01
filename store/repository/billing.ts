import axios from "axios";
import {defineStore} from "pinia";
import type {BillingPeriodKey, BillingServiceKey, BillingUsageData} from "@/lib/billing/types";

interface RespuestaFacturacionUso {
    ok: boolean;
    data: BillingUsageData;
}

export const useFacturacionRepositorio = defineStore("facturacionRepositorio", () => {
    const obtenerUsoFacturacion = async (entrada: { servicio: BillingServiceKey; periodo: BillingPeriodKey }) => {
        return await axios.get<RespuestaFacturacionUso>("/api/billing/usage", {
            params: {
                service: entrada.servicio,
                period: entrada.periodo,
            },
        });
    };

    return {
        obtenerUsoFacturacion,
    };
});
