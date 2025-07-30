"use client"

import * as React from "react"
import {
  Home,
  DollarSign,
  PieChart,
  TrendingUp,
  Lightbulb,
  Building,
  Landmark,
  Scale,
} from "lucide-react"

import { NavMain } from "./nav-main"

import {
  Sidebar,
  SidebarContent,

  SidebarHeader,
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
      title: "Invest",
      url: "/invest",
      icon: TrendingUp,
    },
    {
      title: "Advice",
      url: "/advice",
      icon: Lightbulb,
    },
    {
      title: "Estate Planning",
      url: "/estate-planning",
      icon: Building,
    },
    {
      title: "Equity",
      url: "/equity",
      icon: Landmark,
    },
    {
      title: "Tax",
      url: "/tax",
      icon: Scale,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <DollarSign className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">MoneyFlow</span>
            <span className="truncate text-xs">Personal Finance</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}