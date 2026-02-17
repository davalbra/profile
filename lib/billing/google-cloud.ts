import {getFirebaseAdminApp} from "@/lib/firebase/admin";
import type {BillingPeriodKey, BillingServiceKey, BillingSkuBreakdownItem, BillingUsageData} from "@/lib/billing/types";

const PERIOD_DAYS: Record<BillingPeriodKey, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
};

const SERVICE_FILTER_SQL: Record<BillingServiceKey, string> = {
    firebase: `
        REGEXP_CONTAINS(
            LOWER(CONCAT(service.description, " ", sku.description)),
            r'(firebase|firestore|realtime database|cloud functions|cloud storage|app hosting|firebase hosting)'
        )
    `,
    gemini: `
        REGEXP_CONTAINS(
            LOWER(CONCAT(service.description, " ", sku.description)),
            r'(gemini|generative language|vertex ai)'
        )
    `,
};

type BigQueryRow = {
    f?: Array<{ v?: unknown }>;
};

type BigQueryQueryResponse = {
    jobComplete?: boolean;
    rows?: BigQueryRow[];
    errors?: Array<{ message?: string }>;
};

type BillingConfig = {
    queryProjectId: string;
    billingExportTable: string;
    location?: string;
};

type UsageQueryRecord = {
    usageDate: string;
    serviceName: string;
    skuName: string;
    usageUnit: string | null;
    usageAmount: number;
    netCost: number;
    currency: string | null;
};

export class BillingConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BillingConfigurationError";
    }
}

function normalizeEnv(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    const normalized = value.trim().replace(/^`|`$/g, "");
    return normalized || undefined;
}

function parseBillingExportTable(rawTable: string): string {
    const cleaned = rawTable.replace(/`/g, "");
    const parts = cleaned.split(".");
    if (parts.length !== 3) {
        throw new BillingConfigurationError(
            "GOOGLE_BILLING_EXPORT_TABLE debe tener formato project.dataset.table (ejemplo: mi-proyecto.billing.gcp_billing_export_v1_*).",
        );
    }

    const [projectId, datasetId, tableId] = parts;
    if (!projectId || !datasetId || !tableId) {
        throw new BillingConfigurationError("GOOGLE_BILLING_EXPORT_TABLE no es válido.");
    }

    return `${projectId}.${datasetId}.${tableId}`;
}

function getBillingConfig(): BillingConfig {
    const rawBillingExportTable = normalizeEnv(process.env.GOOGLE_BILLING_EXPORT_TABLE);
    if (!rawBillingExportTable) {
        throw new BillingConfigurationError(
            "Falta GOOGLE_BILLING_EXPORT_TABLE. Activa el export de Cloud Billing a BigQuery y configura esta variable.",
        );
    }

    const billingExportTable = parseBillingExportTable(rawBillingExportTable);

    const queryProjectId =
        normalizeEnv(process.env.GOOGLE_BILLING_QUERY_PROJECT_ID) ||
        normalizeEnv(process.env.FIREBASE_PROJECT_ID) ||
        normalizeEnv(process.env.NEXT_FIREBASE_PROJECT_ID);

    if (!queryProjectId) {
        throw new BillingConfigurationError(
            "Falta GOOGLE_BILLING_QUERY_PROJECT_ID (o FIREBASE_PROJECT_ID) para ejecutar consultas de billing en BigQuery.",
        );
    }

    const location = normalizeEnv(process.env.GOOGLE_BILLING_BQ_LOCATION);

    return {
        queryProjectId,
        billingExportTable,
        location,
    };
}

function parseNumber(value: unknown): number {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function parseString(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (value === null || value === undefined) {
        return null;
    }

    return String(value);
}

function toDateISO(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDateRange(period: BillingPeriodKey): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - (PERIOD_DAYS[period] - 1));

    return {
        startDate: toDateISO(startDate),
        endDate: toDateISO(endDate),
    };
}

async function getGoogleCloudAccessToken(): Promise<string> {
    const credential = getFirebaseAdminApp().options.credential;
    if (!credential || typeof credential.getAccessToken !== "function") {
        throw new Error("No se pudo obtener credenciales para consultar Google Cloud Billing.");
    }

    const token = await credential.getAccessToken();
    if (!token?.access_token) {
        throw new Error("No se pudo generar token de acceso para Google Cloud.");
    }

    return token.access_token;
}

async function queryBigQuery(input: {
    queryProjectId: string;
    location?: string;
    query: string;
    startDate: string;
    endDate: string;
}): Promise<BigQueryRow[]> {
    const accessToken = await getGoogleCloudAccessToken();
    const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(input.queryProjectId)}/queries`;

    const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: input.query,
            useLegacySql: false,
            parameterMode: "NAMED",
            queryParameters: [
                {
                    name: "startDate",
                    parameterType: {type: "DATE"},
                    parameterValue: {value: input.startDate},
                },
                {
                    name: "endDate",
                    parameterType: {type: "DATE"},
                    parameterValue: {value: input.endDate},
                },
            ],
            ...(input.location ? {location: input.location} : {}),
        }),
    });

    const payload = (await response.json().catch(() => null)) as BigQueryQueryResponse | null;

    if (!response.ok) {
        const errorMessage = payload?.errors?.[0]?.message || `BigQuery respondió con estado ${response.status}.`;
        throw new Error(`No se pudo consultar costos de billing: ${errorMessage}`);
    }

    if (!payload?.jobComplete) {
        throw new Error("La consulta de billing tardó más de lo esperado. Intenta de nuevo.");
    }

    if (payload.errors?.length) {
        throw new Error(payload.errors[0].message || "No se pudo consultar billing en BigQuery.");
    }

    return payload.rows || [];
}

function mapUsageRecords(rows: BigQueryRow[]): UsageQueryRecord[] {
    return rows
        .map((row) => {
            const cells = row.f || [];
            const usageDate = parseString(cells[0]?.v);
            const serviceName = parseString(cells[1]?.v);
            const skuName = parseString(cells[2]?.v);
            const usageUnit = parseString(cells[3]?.v);
            const usageAmount = parseNumber(cells[4]?.v);
            const netCost = parseNumber(cells[5]?.v);
            const currency = parseString(cells[6]?.v);

            if (!usageDate || !serviceName || !skuName) {
                return null;
            }

            return {
                usageDate,
                serviceName,
                skuName,
                usageUnit,
                usageAmount,
                netCost,
                currency,
            };
        })
        .filter((record): record is UsageQueryRecord => record !== null);
}

function aggregateUsageData(input: {
    records: UsageQueryRecord[];
    service: BillingServiceKey;
    period: BillingPeriodKey;
    startDate: string;
    endDate: string;
}): BillingUsageData {
    const dailyMap = new Map<string, number>();
    const skuMap = new Map<string, BillingSkuBreakdownItem>();
    const usageByUnit = new Map<string, number>();

    let currency: string | null = null;
    let totalCost = 0;

    for (const record of input.records) {
        const currentDaily = dailyMap.get(record.usageDate) || 0;
        dailyMap.set(record.usageDate, currentDaily + record.netCost);

        const skuKey = `${record.serviceName}::${record.skuName}::${record.usageUnit || "-"}`;
        const currentSku = skuMap.get(skuKey);
        if (currentSku) {
            currentSku.usageAmount += record.usageAmount;
            currentSku.cost += record.netCost;
        } else {
            skuMap.set(skuKey, {
                serviceName: record.serviceName,
                skuName: record.skuName,
                usageUnit: record.usageUnit,
                usageAmount: record.usageAmount,
                cost: record.netCost,
            });
        }

        if (record.usageUnit) {
            usageByUnit.set(record.usageUnit, (usageByUnit.get(record.usageUnit) || 0) + record.usageAmount);
        }

        totalCost += record.netCost;
        if (!currency && record.currency) {
            currency = record.currency;
        }
    }

    const daily = Array.from(dailyMap.entries())
        .map(([date, cost]) => ({date, cost}))
        .sort((left, right) => left.date.localeCompare(right.date));

    const skuBreakdown = Array.from(skuMap.values())
        .sort((left, right) => right.cost - left.cost)
        .slice(0, 20);

    const usageTotals = Array.from(usageByUnit.entries())
        .map(([unit, amount]) => ({unit, amount}))
        .sort((left, right) => right.amount - left.amount);

    const periodDays = PERIOD_DAYS[input.period];

    return {
        service: input.service,
        period: input.period,
        currency: currency || "USD",
        startDate: input.startDate,
        endDate: input.endDate,
        totalCost,
        averageDailyCost: periodDays > 0 ? totalCost / periodDays : 0,
        daily,
        skuBreakdown,
        usageTotals,
        generatedAt: new Date().toISOString(),
        warning:
            daily.length === 0
                ? "No se encontraron costos para este servicio en el periodo seleccionado. Verifica filtros y export de billing."
                : null,
    };
}

function buildUsageQuery(input: { billingExportTable: string; service: BillingServiceKey }): string {
    return `
        SELECT
            DATE (usage_end_time) AS usage_date, service.description AS service_description, sku.description AS sku_description, usage.unit AS usage_unit, SUM (IFNULL(usage.amount, 0)) AS usage_amount, SUM (cost + IFNULL((SELECT SUM (c.amount) FROM UNNEST(credits) c), 0)) AS net_cost, ANY_VALUE(currency) AS currency
        FROM \`${input.billingExportTable}\`
        WHERE DATE (usage_end_time) BETWEEN @startDate
          AND @endDate
          AND ${SERVICE_FILTER_SQL[input.service]}
        GROUP BY usage_date, service_description, sku_description, usage_unit
        ORDER BY usage_date ASC, net_cost DESC
    `;
}

export function parseBillingPeriod(period: string | null): BillingPeriodKey {
    if (period === "7d" || period === "30d" || period === "90d") {
        return period;
    }
    return "30d";
}

export async function getBillingUsage(input: {
    service: BillingServiceKey;
    period: BillingPeriodKey;
}): Promise<BillingUsageData> {
    const config = getBillingConfig();
    const {startDate, endDate} = getDateRange(input.period);
    const query = buildUsageQuery({
        billingExportTable: config.billingExportTable,
        service: input.service,
    });

    const rows = await queryBigQuery({
        queryProjectId: config.queryProjectId,
        location: config.location,
        query,
        startDate,
        endDate,
    });

    const records = mapUsageRecords(rows);

    return aggregateUsageData({
        records,
        service: input.service,
        period: input.period,
        startDate,
        endDate,
    });
}
