import {BillingUsagePanel} from "@/components/dashboard/billing-usage-panel";

export default function DashboardBillingFirebasePage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <BillingUsagePanel
                    service="firebase"
                    title="Costos por uso: Firebase"
                    description="Visualiza el consumo de tus servicios Firebase basado en export de Cloud Billing a BigQuery."
                />
            </div>
        </div>
    );
}
