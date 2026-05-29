"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import type { Occurrence, Priority } from "@/lib/types"
import { categoryLabels, statusLabels, priorityLabels } from "@/lib/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  ThumbsUp,
  Users,
  MapPin,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Heart,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface OccurrenceDetailSheetProps {
  occurrence: Occurrence | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OccurrenceDetailSheet({
  occurrence,
  open,
  onOpenChange,
}: OccurrenceDetailSheetProps) {
  const {
    supportOccurrence,
    voteOnPriority,
    confirmResolution,
    contestResolution,
    contestExistence,
    addComment,
    getDynamicPriority,
    getUserVote,
  } = useApp()
  const [newComment, setNewComment] = useState("")
  const [showAllComments, setShowAllComments] = useState(false)
  
  // Estado para o modal de Voto Consciente
  const [showVoteDialog, setShowVoteDialog] = useState(false)
  const [pendingVotePriority, setPendingVotePriority] = useState<Priority | null>(null)
  const [isChangingVote, setIsChangingVote] = useState(false)

  if (!occurrence) return null

  const dynamicPriority = getDynamicPriority(occurrence)
  const totalPriorityVotes =
    occurrence.priorityVotes.baixa +
    occurrence.priorityVotes.media +
    occurrence.priorityVotes.alta
  const hasContestation = occurrence.contestations >= 1
  const hasExistenceContestation = occurrence.existenceContestations >= 3
  const isNotResolved = occurrence.status !== "resolvida"
  
  // Verificar estado do voto do usuario
  const userVote = getUserVote(occurrence.id)
  const hasVoted = !!userVote

  const handleSupport = () => {
    supportOccurrence(occurrence.id)
    toast.success("Você apoiou esta ocorrência!", {
      description: `${occurrence.supports + 1} pessoas apoiam este problema`,
    })
  }

  // Inicia o fluxo de votacao consciente
  const initiateVote = (priority: Priority) => {
    const existingVote = getUserVote(occurrence.id)
    
    // Se esta alterando o voto
    if (existingVote) {
      setIsChangingVote(true)
    } else {
      setIsChangingVote(false)
    }
    
    setPendingVotePriority(priority)
    setShowVoteDialog(true)
  }

  // Confirma o voto apos reflexao
  const confirmVote = () => {
    if (pendingVotePriority) {
      voteOnPriority(occurrence.id, pendingVotePriority)
      
      if (isChangingVote) {
        toast.success("Voto alterado!", {
          description: `Seu voto foi alterado para prioridade ${priorityLabels[pendingVotePriority]}.`,
        })
      } else {
        toast.success("Voto Consciente registrado!", {
          description: `Você votou para prioridade ${priorityLabels[pendingVotePriority]}.`,
        })
      }
    }
    setShowVoteDialog(false)
    setPendingVotePriority(null)
  }

  const handleConfirmResolution = () => {
    confirmResolution(occurrence.id)
    toast.success("Confirmação registrada!", {
      description: "Obrigado por confirmar que o problema foi resolvido",
    })
  }

  const handleContestResolution = () => {
    contestResolution(occurrence.id)
    toast.warning("Contestação registrada", {
      description: "Seu relato foi registrado. Obrigado pelo feedback.",
    })
  }

  const handleContestExistence = () => {
    contestExistence(occurrence.id)
    toast.warning("Contestação registrada", {
      description: "Seu relato de que esta ocorrência não existe foi registrado.",
    })
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment(occurrence.id, newComment.trim())
      setNewComment("")
      toast.success("Comentário adicionado!")
    }
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "alta":
        return "text-red-500"
      case "media":
        return "text-orange-400"
      case "baixa":
        return "text-yellow-300"
    }
  }

  const displayedComments = showAllComments
    ? occurrence.comments
    : occurrence.comments.slice(-3)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          <SheetHeader className="flex-shrink-0 p-6 pb-0">
            <SheetTitle className="text-left pr-8 line-clamp-2">{occurrence.title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <div className="space-y-6 pb-6">
              {/* Image placeholder */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <MapPin className="h-12 w-12 text-muted-foreground" />
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{categoryLabels[occurrence.category]}</Badge>
                <Badge
                  className={
                    occurrence.status === "resolvida"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : occurrence.status === "em_analise"
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }
                >
                  {occurrence.status === "resolvida" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {occurrence.status === "em_analise" && <Clock className="h-3 w-3 mr-1" />}
                  {occurrence.status === "pendente" && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {statusLabels[occurrence.status]}
                  {hasContestation && occurrence.status === "resolvida" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-3 w-3 ml-1 text-yellow-300" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-sm">
                            Esta ocorrência possui relatos indicando que o problema 
                            talvez ainda não tenha sido resolvido.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Badge>
                <Badge
                  variant="outline"
                  className={getPriorityColor(dynamicPriority)}
                >
                  Prioridade: {priorityLabels[dynamicPriority]}
                </Badge>
                {hasExistenceContestation && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-yellow-300 border-yellow-300/50">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Ocorrência Contestada
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          {occurrence.existenceContestations} pessoa(s) contestaram a existência 
                          desta ocorrência. A validade pode estar sendo questionada.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {occurrence.description}
                </p>
              </div>

              {/* Location & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1 text-sm">Localização</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {occurrence.neighborhood}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {occurrence.address}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm">Data do registro</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(occurrence.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(occurrence.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Support Section */}
              <div>
                <div className="mb-3">
                  <h4 className="font-medium">Apoiar Ocorrência</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Confirme que este problema existe e precisa de atenção
                  </p>
                  <Button onClick={handleSupport} className="gap-2 w-full">
                    <ThumbsUp className="h-4 w-4" />
                    Apoiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {occurrence.supports} pessoa{occurrence.supports !== 1 ? "s" : ""} apoia{occurrence.supports !== 1 ? "m" : ""} esta ocorrência
                </p>
              </div>

              {/* Existence Validation (for pending/in analysis) */}
              {isNotResolved && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Validação da Ocorrência</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Você encontrou este problema no local indicado?
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-yellow-300/50 hover:bg-yellow-300/10 text-yellow-600"
                      onClick={handleContestExistence}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Problema não encontrado
                    </Button>
                    {occurrence.existenceContestations > 0 && (
                      <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {occurrence.existenceContestations} pessoa{occurrence.existenceContestations !== 1 ? "s" : ""} contestou a existência desta ocorrência
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Priority Voting - Voto Consciente */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Voto Consciente de Prioridade</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Vote na gravidade que você percebe neste problema.
                </p>
                
                {/* Status do voto do usuario */}
                {hasVoted && (
                  <div className="mb-3 p-2 rounded-md text-xs flex items-center gap-2 bg-primary/10 text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Seu voto: <strong>{priorityLabels[userVote.priority]}</strong></span>
                  </div>
                )}
                
                <div className="flex gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 border-green-500/50 hover:bg-green-500/10 ${
                      userVote?.priority === "baixa" ? "bg-green-500/20 border-green-500" : ""
                    }`}
                    onClick={() => initiateVote("baixa")}
                  >
                    Baixa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 border-yellow-300/50 hover:bg-yellow-300/10 ${
                      userVote?.priority === "media" ? "bg-yellow-300/20 border-yellow-300" : ""
                    }`}
                    onClick={() => initiateVote("media")}
                  >
                    Média
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 border-red-500/50 hover:bg-red-500/10 ${
                      userVote?.priority === "alta" ? "bg-red-500/20 border-red-500" : ""
                    }`}
                    onClick={() => initiateVote("alta")}
                  >
                    Alta
                  </Button>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Baixa: {occurrence.priorityVotes.baixa}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-300" />
                    Média: {occurrence.priorityVotes.media}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Alta: {occurrence.priorityVotes.alta}
                  </span>
                </div>
                {totalPriorityVotes > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalPriorityVotes} voto{totalPriorityVotes !== 1 ? "s" : ""} no total
                  </p>
                )}
              </div>

              {/* Resolution Confirmation (only for resolved) */}
              {occurrence.status === "resolvida" && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Validação da Resolução</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Verifique se o problema foi realmente solucionado no local
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-green-500/50 hover:bg-green-500/10 justify-start"
                        onClick={handleConfirmResolution}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                        Confirmar resolução
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-yellow-300/50 hover:bg-yellow-300/10 justify-start"
                        onClick={handleContestResolution}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2 text-yellow-300 shrink-0" />
                        Problema continua
                      </Button>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs">
                      <p className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {occurrence.confirmations} confirmou resolvido
                      </p>
                      {occurrence.contestations > 0 && (
                        <p className="text-yellow-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {occurrence.contestations} relatou problema
                        </p>
                      )}
                    </div>
                    {hasContestation && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="mt-2 p-2 bg-yellow-300/10 rounded-md border border-yellow-300/30 text-xs text-yellow-600 flex items-center gap-2 cursor-help">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              <span>Atenção: há relatos de que o problema ainda não foi resolvido</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-sm">
                              Esta ocorrência possui {occurrence.contestations} relato(s) indicando que o problema 
                              talvez ainda não tenha sido resolvido. Verifique pessoalmente se possível.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-3">Linha do Tempo</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="w-0.5 h-full bg-border" />
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium">Ocorrência registrada</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(occurrence.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  {occurrence.status === "em_analise" && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="w-0.5 h-full bg-border" />
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-medium">Em análise</p>
                        <p className="text-xs text-muted-foreground">
                          Aguardando verificação
                        </p>
                      </div>
                    </div>
                  )}
                  {occurrence.status === "resolvida" && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Resolvida</p>
                        <p className="text-xs text-muted-foreground">
                          Problema solucionado
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentários da Comunidade
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {occurrence.comments.length} comentário{occurrence.comments.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {occurrence.comments.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mb-3"
                    onClick={() => setShowAllComments(!showAllComments)}
                  >
                    {showAllComments ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Ver todos ({occurrence.comments.length})
                      </>
                    )}
                  </Button>
                )}

                <div className="space-y-3 mb-4">
                  {displayedComments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum comentário ainda. Seja o primeiro!
                    </p>
                  ) : (
                    displayedComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-muted/50 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {comment.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar comentário
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de Voto Consciente */}
      <AlertDialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              {isChangingVote ? "Alterar Voto de Prioridade" : "Voto Consciente"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              {isChangingVote ? (
                <p>
                  Você está prestes a alterar seu voto de <strong>{userVote && priorityLabels[userVote.priority]}</strong> para{" "}
                  <strong className={
                    pendingVotePriority === "alta" ? "text-red-500" :
                    pendingVotePriority === "media" ? "text-orange-400" : "text-green-500"
                  }>
                    {pendingVotePriority && priorityLabels[pendingVotePriority]}
                  </strong>.
                </p>
              ) : (
                <>
                  <p>
                    Antes de votar, pedimos que reflita: o problema relatado nesta ocorrência é realmente uma prioridade <strong className={
                      pendingVotePriority === "alta" ? "text-red-500" :
                      pendingVotePriority === "media" ? "text-orange-400" : "text-green-500"
                    }>
                      {pendingVotePriority && priorityLabels[pendingVotePriority].toLowerCase()}
                    </strong>?
                  </p>
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-md">
                    <p className="text-sm text-primary font-medium mb-2">
                      Momento de Empatia
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Existem outras pessoas na plataforma com problemas que podem ser mais urgentes que esse? 
                      Uma rua sem iluminação pode representar risco de vida para alguns, enquanto um buraco pequeno 
                      pode ser apenas um incômodo. Pense no impacto real para a comunidade.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Como implementação futura, você só poderá alterar seu voto uma vez. Para mais informações, acesse a seção &quot;Ideias e Possíveis Evoluções&quot; na página de Avaliação.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVote}>
              {isChangingVote ? "Confirmar Alteração" : "Confirmar Voto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
