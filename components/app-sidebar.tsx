"use client"

import * as React from "react"
import Link from "next/link"
import {Bot, ChevronDown, CircleDollarSign, Flame, ImagePlus, Images, PanelTop, Sparkles, Zap} from "lucide-react"
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
    const isBillingRoute = pathname.startsWith("/dashboard/billing")
    const [imagesOpen, setImagesOpen] = React.useState(isImagesRoute)
    const [billingOpen, setBillingOpen] = React.useState(isBillingRoute)

    React.useEffect(() => {
        if (isImagesRoute) {
            setImagesOpen(true)
        }
    }, [isImagesRoute])

    React.useEffect(() => {
        if (isBillingRoute) {
            setBillingOpen(true)
        }
    }, [isBillingRoute])

    const optimizeActive =
        pathname === "/dashboard/images" ||
        pathname === "/dashboard/images/optimize"
    const copiesActive = pathname === "/dashboard/images/copies"
    const galleryActive = pathname === "/dashboard/images/gallery"
    const billingFirebaseActive = pathname === "/dashboard/billing" || pathname === "/dashboard/billing/firebase"
    const billingGeminiActive = pathname === "/dashboard/billing/gemini"

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
                                            <Zap/>
                                            <span>Optimizar</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={copiesActive}>
                                        <Link href="/dashboard/images/copies">
                                            <Sparkles/>
                                            <span>n8n</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={galleryActive}>
                                        <Link href="/dashboard/images/gallery">
                                            <Images/>
                                            <span>Galería</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        ) : null}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            type="button"
                            tooltip="Billing"
                            isActive={isBillingRoute}
                            onClick={() => setBillingOpen((open) => !open)}
                        >
                            <CircleDollarSign/>
                            <span>Billing</span>
                            <ChevronDown className={cn("ml-auto transition-transform", billingOpen && "rotate-180")}/>
                        </SidebarMenuButton>

                        {billingOpen ? (
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={billingFirebaseActive}>
                                        <Link href="/dashboard/billing/firebase">
                                            <Flame/>
                                            <span>Firebase</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={billingGeminiActive}>
                                        <Link href="/dashboard/billing/gemini">
                                            <Bot/>
                                            <span>Google Gemini API</span>
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
