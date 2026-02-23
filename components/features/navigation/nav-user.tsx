"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BadgeCheck,
  Bell,
  CreditCard,
  LogOut,
  Settings,
  Sparkles,
  Globe,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/atoms/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/molecules/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/organisms/sidebar"
import { useAuth } from '@/contexts/AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { CategoryManager } from '@/components/CategoryManager'
import { AccountManager } from '@/components/AccountManager'
import { AccountProvider } from '@/contexts/AccountContext'
import { preferences } from '@/lib/api/user-preferences'
import { setLocaleCookie, type SupportedLocale } from '@/lib/actions/locale'

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { signOut, user: authUser } = useAuth()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('nav')
  const [menuOpen, setMenuOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [accountManagerOpen, setAccountManagerOpen] = useState(false)

  const handleLanguageChange = async (newLocale: string) => {
    const lang = newLocale as SupportedLocale
    await setLocaleCookie(lang)
    if (authUser?.id) {
      await preferences.setLanguage(authUser.id, lang)
    }
    Analytics.track('Language Changed', { locale: lang, trigger: 'user_menu' })
    router.refresh()
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => Analytics.track('Upgrade To Pro Clicked', { trigger: 'user_menu' })}>
                  <Sparkles />
                  {t('upgradeLabel')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => {
                  setMenuOpen(false)
                  setCategoryManagerOpen(true)
                  Analytics.track('Manage Categories Clicked', { trigger: 'user_menu' })
                }}>
                  <Settings />
                  {t('manageCategories')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setMenuOpen(false)
                  setAccountManagerOpen(true)
                  Analytics.track('Manage Accounts Clicked', { trigger: 'user_menu' })
                }}>
                  <CreditCard />
                  {t('manageAccounts')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => Analytics.track('Account Settings Clicked', { trigger: 'user_menu' })}>
                  <BadgeCheck />
                  {t('account')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => Analytics.track('Billing Clicked', { trigger: 'user_menu' })}>
                  <CreditCard />
                  {t('billing')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => Analytics.track('Notifications Clicked', { trigger: 'user_menu' })}>
                  <Bell />
                  {t('notifications')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground px-2 py-1">
                  <Globe className="h-3.5 w-3.5" />
                  {t('language')}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={locale} onValueChange={handleLanguageChange}>
                  <DropdownMenuRadioItem value="en">
                    🇬🇧 {t('languageOptions.en')}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="id">
                    🇮🇩 {t('languageOptions.id')}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setMenuOpen(false)
                Analytics.track('Logout Clicked', {
                  trigger: 'user_menu'
                })
                signOut()
              }}>
                <LogOut />
                {t('logOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Manager Sheets - rendered outside dropdown to avoid portal issues */}
      <CategoryManager open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />
      <AccountProvider>
        <AccountManager open={accountManagerOpen} onOpenChange={setAccountManagerOpen} />
      </AccountProvider>
    </>
  )
}
