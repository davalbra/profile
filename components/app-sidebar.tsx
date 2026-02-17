"use client"

import * as React from "react"
import Link from "next/link"
import {ChevronDown, CopyPlus, GalleryHorizontal, ImagePlus, PanelTop, Sparkles} from "lucide-react"
import {usePathname} from "next/navigation"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {cn} from "@/lib/utils"

export function AppSidebar({...props}: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const isImagesRoute = pathname.startsWith("/dashboard/images")
    const [imagesOpen, setImagesOpen] = React.useState(isImagesRoute)

    React.useEffect(() => {
        if (isImagesRoute) {
            setImagesOpen(true)
        }
    }, [isImagesRoute])

    const optimizeActive =
        pathname === "/dashboard/images" ||
        pathname === "/dashboard/images/optimize"
    const copiesActive = pathname === "/dashboard/images/copies"
    const galleryActive = pathname === "/dashboard/images/gallery"

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton className="data-[slot=sidebar-menu-button]:!p-1.5">
                            <PanelTop className="!size-5"/>
                            <span className="text-base font-semibold">Panel</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            type="button"
                            tooltip="Imágenes"
                            isActive={isImagesRoute}
                            onClick={() => setImagesOpen((open) => !open)}
                        >
                            <ImagePlus/>
                            <span>Imágenes</span>
                            <ChevronDown className={cn("ml-auto transition-transform", imagesOpen && "rotate-180")}/>
                        </SidebarMenuButton>

                        {imagesOpen ? (
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={optimizeActive}>
                                        <Link href="/dashboard/images/optimize">
                                            <Sparkles/>
                                            <span>Optimizar</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={copiesActive}>
                                        <Link href="/dashboard/images/copies">
                                            <CopyPlus/>
                                            <span>Copias n8n</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={galleryActive}>
                                        <Link href="/dashboard/images/gallery">
                                            <GalleryHorizontal/>
                                            <span>Galería</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        ) : null}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    )
}
