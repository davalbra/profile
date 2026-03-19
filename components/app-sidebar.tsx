"use client"

import * as React from "react"
import Link from "next/link"
import {Bot, ChevronDown, CircleDollarSign, Cookie, Flame, Headphones, ImagePlus, Images, Music4, PanelTop, Search, Sparkles, TrendingUp, Wrench, Zap} from "lucide-react"
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
    const isMcpRoute = pathname.startsWith("/dashboard/mcp")
    const isTradingRoute = pathname.startsWith("/dashboard/trading")
    const isMilkaRoute = pathname.startsWith("/dashboard/milka")
    const [imagesOpen, setImagesOpen] = React.useState(isImagesRoute)
    const [billingOpen, setBillingOpen] = React.useState(isBillingRoute)
    const [mcpOpen, setMcpOpen] = React.useState(isMcpRoute)
    const [tradingOpen, setTradingOpen] = React.useState(isTradingRoute)
    const [milkaOpen, setMilkaOpen] = React.useState(isMilkaRoute)

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

    React.useEffect(() => {
        if (isMcpRoute) {
            setMcpOpen(true)
        }
    }, [isMcpRoute])

    React.useEffect(() => {
        if (isTradingRoute) {
            setTradingOpen(true)
        }
    }, [isTradingRoute])

    React.useEffect(() => {
        if (isMilkaRoute) {
            setMilkaOpen(true)
        }
    }, [isMilkaRoute])

    const optimizeActive =
        pathname === "/dashboard/images" ||
        pathname === "/dashboard/images/optimize"
    const copiesActive = pathname === "/dashboard/images/copies"
    const galleryActive = pathname === "/dashboard/images/gallery"
    const billingFirebaseActive = pathname === "/dashboard/billing" || pathname === "/dashboard/billing/firebase"
    const billingGeminiActive = pathname === "/dashboard/billing/gemini"
    const mcpOptimizeActive = pathname === "/dashboard/mcp" || pathname === "/dashboard/mcp/optimize"
    const mcpBillingActive = pathname === "/dashboard/mcp/billing"
    const tradingFuturesActive = pathname === "/dashboard/trading" || pathname === "/dashboard/trading/futures"
    const milkaMusicaActive = pathname === "/dashboard/milka" || pathname === "/dashboard/milka/musica"
    const milkaCookiesActive = pathname === "/dashboard/milka/cookies"
    const milkaSearchSyncActive = pathname === "/dashboard/milka/search-sync"

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
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            type="button"
                            tooltip="Trading"
                            isActive={isTradingRoute}
                            onClick={() => setTradingOpen((open) => !open)}
                        >
                            <TrendingUp/>
                            <span>Trading</span>
                            <ChevronDown className={cn("ml-auto transition-transform", tradingOpen && "rotate-180")}/>
                        </SidebarMenuButton>

                        {tradingOpen ? (
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={tradingFuturesActive}>
                                        <Link href="/dashboard/trading/futures">
                                            <TrendingUp/>
                                            <span>Futuros Binance</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        ) : null}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            type="button"
                            tooltip="Milka"
                            isActive={isMilkaRoute}
                            onClick={() => setMilkaOpen((open) => !open)}
                        >
                            <Headphones/>
                            <span>Milka</span>
                            <ChevronDown className={cn("ml-auto transition-transform", milkaOpen && "rotate-180")}/>
                        </SidebarMenuButton>

                        {milkaOpen ? (
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={milkaMusicaActive}>
                                        <Link href="/dashboard/milka/musica">
                                            <Music4/>
                                            <span>Musica</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={milkaCookiesActive}>
                                        <Link href="/dashboard/milka/cookies">
                                            <Cookie/>
                                            <span>Cookies</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={milkaSearchSyncActive}>
                                        <Link href="/dashboard/milka/search-sync">
                                            <Search/>
                                            <span>Buscar Sync</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        ) : null}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            type="button"
                            tooltip="MCP"
                            isActive={isMcpRoute}
                            onClick={() => setMcpOpen((open) => !open)}
                        >
                            <Wrench/>
                            <span>MCP</span>
                            <ChevronDown className={cn("ml-auto transition-transform", mcpOpen && "rotate-180")}/>
                        </SidebarMenuButton>

                        {mcpOpen ? (
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={mcpOptimizeActive}>
                                        <Link href="/dashboard/mcp/optimize">
                                            <Zap/>
                                            <span>Optimizar</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={mcpBillingActive}>
                                        <Link href="/dashboard/mcp/billing">
                                            <CircleDollarSign/>
                                            <span>Billing</span>
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
