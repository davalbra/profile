import {Suspense} from "react";
import {ImagesManager} from "@/components/dashboard/images-manager"

export default function DashboardImagesOptimizePage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <Suspense fallback={null}>
                    <ImagesManager/>
                </Suspense>
            </div>
        </div>
    )
}
