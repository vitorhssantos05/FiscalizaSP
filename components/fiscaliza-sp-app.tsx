"use client"

import { useState, useEffect } from "react"
import { AppProvider, useApp } from "@/lib/app-context"
import { AuthScreen } from "@/components/auth-screen"
import { Navigation, type Page } from "@/components/navigation"
import { HomePage } from "@/components/home-page"
import { ExplorePage } from "@/components/explore-page"
import { RegisterPage } from "@/components/register-page"
import { AdminPage } from "@/components/admin-page"
import { EvaluationPage } from "@/components/evaluation-page"
import { Toaster } from "@/components/ui/sonner"

function AppContent() {
  const { isAuthenticated, isDarkMode, isAdminMode } = useApp()
  const [currentPage, setCurrentPage] = useState<Page>("home")
  const [isAuthComplete, setIsAuthComplete] = useState(false)

  // Initialize dark mode on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    }
  }, [isDarkMode])

  // Redirect from admin page if admin mode is disabled
  useEffect(() => {
    if (currentPage === "admin" && !isAdminMode) {
      setCurrentPage("home")
    }
  }, [isAdminMode, currentPage])

  if (!isAuthComplete) {
    return <AuthScreen onAuthSuccess={() => setIsAuthComplete(true)} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={setCurrentPage} />
      case "explore":
        return <ExplorePage />
      case "register":
        return <RegisterPage onSuccess={() => setCurrentPage("explore")} />
      case "admin":
        return isAdminMode ? <AdminPage /> : <HomePage onNavigate={setCurrentPage} />
      case "evaluation":
        return <EvaluationPage />
      default:
        return <HomePage onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="pb-16 lg:pb-0">{renderPage()}</main>
    </div>
  )
}

export function FiscalizaSPApp() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster richColors position="top-right" />
    </AppProvider>
  )
}
