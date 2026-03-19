import { MilkaCookieCleaner } from "@/components/dashboard/milka-cookie-cleaner"

export default function DashboardMilkaCookiesPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <MilkaCookieCleaner />
      </div>
    </div>
  )
}
