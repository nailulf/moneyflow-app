"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  Home,
  DollarSign,
  LineChart,
  PieChart,
  // TrendingUp,  // Hidden: Invest
  Lightbulb,
  // Building,    // Hidden: Estate Planning
  // Landmark,    // Hidden: Equity
  // Scale,       // Hidden: Tax
  GalleryVerticalEnd,
  Wallet,
} from "lucide-react"

import { NavMain } from "./nav-main"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/organisms/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('navigation')

  const navMain = [
    { title: t('items.dashboard'), url: "/", icon: Home, isActive: true },
    { title: t('items.accounts'), url: "/accounts", icon: Wallet },
    { title: t('items.spending'), url: "/spending", icon: DollarSign },
    { title: t('items.portfolio'), url: "/portfolio", icon: PieChart },
    { title: t('items.forecast'), url: "/forecast", icon: LineChart },
    { title: t('items.advice'), url: "/advice", icon: Lightbulb },
    // Hidden until features are ready:
    // { title: t('items.invest'), url: "/invest", icon: TrendingUp },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MoneyFlow</span>
                  <span className="truncate text-xs">{t('sidebar.tagline')}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
