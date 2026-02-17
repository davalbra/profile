import {BillingUsagePanel} from "@/components/dashboard/billing-usage-panel";

export default function DashboardBillingGeminiPage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <BillingUsagePanel
                    service="gemini"
                    title="Costos por uso: Google Gemini API"
                    description="Visualiza consumo y costo de Gemini API desde Cloud Billing (incluyendo SKUs detectados como Gemini / Generative Language / Vertex AI)."
                />
            </div>
        </div>
    );
}
