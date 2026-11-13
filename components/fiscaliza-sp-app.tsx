"use client"

import { useEffect, useState } from "react"
import { AppProvider, useApp } from "@/lib/app-context"
import { Navigation, type Page } from "@/components/navigation"
import { HomePage } from "@/components/home-page"
import { ExplorePage } from "@/components/explore-page"
import { RegisterPage } from "@/components/register-page"
import { EvaluationPage } from "@/components/evaluation-page"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function AppContent() {
  const {
    isDarkMode,
    nicknameDialogOpen,
    submitNickname,
    closeNicknameDialog,
  } = useApp()
  const [currentPage, setCurrentPage] = useState<Page>("home")
  const [nicknameInput, setNicknameInput] = useState("")

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    }
  }, [isDarkMode])

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={setCurrentPage} />
      case "explore":
        return <ExplorePage />
      case "register":
        return <RegisterPage onSuccess={() => setCurrentPage("explore")} />
      case "evaluation":
        return <EvaluationPage />
      default:
        return <HomePage onNavigate={setCurrentPage} />
    }
  }

  const handleNicknameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedNickname = nicknameInput.trim()
    if (!trimmedNickname) return
    submitNickname(trimmedNickname)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="pb-16 lg:pb-0">{renderPage()}</main>
      <Dialog open={nicknameDialogOpen} onOpenChange={(open) => !open && closeNicknameDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha um apelido</DialogTitle>
            <DialogDescription>
              Use um nome temporário para continuar. Ele não verifica sua identidade nem cria uma conta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNicknameSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nickname">Apelido</Label>
              <Input
                id="nickname"
                autoComplete="nickname"
                maxLength={40}
                value={nicknameInput}
                onChange={(event) => setNicknameInput(event.target.value)}
                placeholder="Como quer aparecer?"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeNicknameDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!nicknameInput.trim()}>
                Continuar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
