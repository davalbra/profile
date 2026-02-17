import {OptimizedImageDetail} from "@/components/dashboard/optimized-image-detail";

export default async function DashboardOptimizedImageDetailPage({
                                                                    params,
                                                                }: {
    params: Promise<{ slug: string }>;
}) {
    const {slug} = await params;

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <OptimizedImageDetail slug={slug}/>
            </div>
        </div>
    );
}
