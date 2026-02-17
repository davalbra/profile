export type BillingServiceKey = "firebase" | "gemini";

export type BillingPeriodKey = "7d" | "30d" | "90d";

export type BillingDailyCostPoint = {
    date: string;
    cost: number;
};

export type BillingSkuBreakdownItem = {
    serviceName: string;
    skuName: string;
    usageUnit: string | null;
    usageAmount: number;
    cost: number;
};

export type BillingUsageTotalByUnit = {
    unit: string;
    amount: number;
};

export type BillingUsageData = {
    service: BillingServiceKey;
    period: BillingPeriodKey;
    currency: string;
    startDate: string;
    endDate: string;
    totalCost: number;
    averageDailyCost: number;
    daily: BillingDailyCostPoint[];
    skuBreakdown: BillingSkuBreakdownItem[];
    usageTotals: BillingUsageTotalByUnit[];
    generatedAt: string;
    warning: string | null;
};
