"use client"

import * as React from "react"
import Link from "next/link"
import {
  Home,
  DollarSign,
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
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "MoneyFlow User",
    email: "user@moneyflow.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: Wallet,
    },
    {
      title: "Spending",
      url: "/spending",
      icon: DollarSign,
    },
    {
      title: "Portfolio",
      url: "/portfolio",
      icon: PieChart,
    },
    {
      title: "Advice",
      url: "/advice",
      icon: Lightbulb,
    },
    // Hidden until features are ready:
    // { title: "Invest", url: "/invest", icon: TrendingUp },
    // { title: "Estate Planning", url: "/estate-planning", icon: Building },
    // { title: "Equity", url: "/equity", icon: Landmark },
    // { title: "Tax", url: "/tax", icon: Scale },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                  <span className="truncate text-xs">Personal Finance</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}