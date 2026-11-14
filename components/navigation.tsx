"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2,
  Moon,
  Sun,
  Home,
  MapPin,
  PlusCircle,
  LayoutDashboard,
  ClipboardCheck,
  Shield,
} from "lucide-react"

type Page = "home" | "explore" | "register" | "admin" | "evaluation"

interface NavigationProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  isAdminDemoMode: boolean
  onAdminDemoModeChange: (enabled: boolean) => void
}

const navItems = [
  { id: "home" as Page, label: "Home", labelShort: "Home", icon: Home },
  { id: "explore" as Page, label: "Explorar Ocorrências", labelShort: "Explorar", icon: MapPin },
  { id: "register" as Page, label: "Registrar Ocorrência", labelShort: "Registrar", icon: PlusCircle },
  { id: "admin" as Page, label: "Painel Admin", labelShort: "Admin", icon: LayoutDashboard, adminOnly: true },
  { id: "evaluation" as Page, label: "Avaliação Acadêmica", labelShort: "Avaliar", icon: ClipboardCheck },
]

export function Navigation({
  currentPage,
  onPageChange,
  isAdminDemoMode,
  onAdminDemoModeChange,
}: NavigationProps) {
  const { nickname, isDarkMode, toggleDarkMode } = useApp()
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdminDemoMode,
  )
  
  // Items para a barra inferior mobile (limitado a 5)
  const mobileNavItems = visibleNavItems.slice(0, 5)

  return (
    <>
      {/* Header Principal */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 lg:h-16 items-center px-4">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="p-1.5 sm:p-2 bg-primary rounded-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-base sm:text-lg text-foreground">FiscalizaSP</span>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-1 mx-4">
            {visibleNavItems.map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onPageChange(item.id)}
                className={`gap-2 ${item.adminOnly ? "text-primary" : ""}`}
                aria-label={item.adminOnly ? "Painel Admin (demonstração)" : undefined}
                title={item.adminOnly ? "Painel demonstrativo; sem privilégios administrativos reais" : undefined}
              >
                <item.icon className="h-4 w-4" />
                {isAdminDemoMode ? item.labelShort : item.label}
              </Button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0 ml-auto lg:ml-0">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {nickname?.charAt(0).toUpperCase() || "V"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium text-foreground">
                    {nickname || "Visitante"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground">{nickname || "Visitante"}</span>
                    <span className="text-xs text-muted-foreground">
                      Apelido temporário, sem autenticação
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div
                  className={`flex items-center justify-between gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
                    isAdminDemoMode
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-muted/20 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Shield aria-hidden="true" className="size-4" />
                    </div>
                    <Label htmlFor="admin-demo-mode" className="cursor-pointer text-sm font-semibold">
                      Modo Admin
                    </Label>
                  </div>
                  <Switch
                    id="admin-demo-mode"
                    checked={isAdminDemoMode}
                    onCheckedChange={onAdminDemoModeChange}
                    aria-describedby="admin-demo-description"
                  />
                </div>
                <p id="admin-demo-description" className="px-2 pt-2 text-xs text-muted-foreground">
                  Gerencie e analise as ocorrências registradas na plataforma
                </p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-md safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                aria-label={item.adminOnly ? "Painel Admin (demonstração)" : item.label}
                title={item.adminOnly ? "Painel demonstrativo; sem privilégios administrativos reais" : undefined}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  isActive || item.adminOnly
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {item.labelShort}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export type { Page }
