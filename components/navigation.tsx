"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2,
  Moon,
  Sun,
  Shield,
  LogOut,
  User,
  Home,
  MapPin,
  PlusCircle,
  LayoutDashboard,
  ClipboardCheck,
  Info,
  X,
} from "lucide-react"
import { useState, useEffect } from "react"

type Page = "home" | "explore" | "register" | "admin" | "evaluation"

interface NavigationProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

const navItems = [
  { id: "home" as Page, label: "Home", labelShort: "Home", icon: Home },
  { id: "explore" as Page, label: "Explorar Ocorrências", labelShort: "Explorar", icon: MapPin },
  { id: "register" as Page, label: "Registrar Ocorrência", labelShort: "Registrar", icon: PlusCircle },
  { id: "admin" as Page, label: "Painel Admin", labelShort: "Admin", icon: LayoutDashboard, adminOnly: true },
  { id: "evaluation" as Page, label: "Avaliação Acadêmica", labelShort: "Avaliar", icon: ClipboardCheck },
]

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const { user, isAdminMode, toggleAdminMode, isDarkMode, toggleDarkMode, logout } = useApp()
  const [showAdminTip, setShowAdminTip] = useState(false)

  // Mostrar dica do modo admin após 2 segundos se não estiver em modo admin
  useEffect(() => {
    if (!isAdminMode) {
      const timer = setTimeout(() => {
        const hasSeenTip = localStorage.getItem("hasSeenAdminTip")
        if (!hasSeenTip) {
          setShowAdminTip(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isAdminMode])

  const dismissAdminTip = () => {
    setShowAdminTip(false)
    localStorage.setItem("hasSeenAdminTip", "true")
  }

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdminMode
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
              >
                <item.icon className="h-4 w-4" />
                {isAdminMode ? item.labelShort : item.label}
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
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium text-foreground">
                    {user?.name || "Usuário"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-foreground">{user?.name || "Usuário"}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {user?.email || "usuario@email.com"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <User className="h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <Label htmlFor="admin-mode-dropdown" className="text-sm cursor-pointer font-medium">
                        Modo Admin
                      </Label>
                    </div>
                    <Switch
                      id="admin-mode-dropdown"
                      checked={isAdminMode}
                      onCheckedChange={toggleAdminMode}
                    />
                  </div>
                  {!isAdminMode && (
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                      Ative para gerenciar ocorrências
                    </p>
                  )}
                </div>
                {isAdminMode && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2">
                      <Shield className="h-4 w-4" />
                      Configurações Admin
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Admin Tip Alert */}
        {showAdminTip && !isAdminMode && (
          <div className="border-t border-border/50 bg-primary/5 px-4 py-3">
            <div className="container mx-auto">
              <Alert className="border-primary/20 bg-transparent">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span className="text-sm text-foreground">
                    <strong>Dica:</strong> Clique no seu perfil de usuário para acessar o <strong>Modo Administrador</strong> e gerenciar as ocorrências.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissAdminTip}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
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
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                } ${item.adminOnly ? "text-primary" : ""}`}
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
