"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useApp } from "@/lib/app-context"
import type { OccurrenceCategory, Priority } from "@/lib/types"
import { categoryLabels, priorityLabels } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  MapPin,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Navigation,
  ImageIcon,
} from "lucide-react"

// Dynamic import for map
const MapComponent = dynamic(
  () => import("@/components/map-component").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/50 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    ),
  }
)

interface RegisterPageProps {
  onSuccess?: () => void
}

export function RegisterPage({ onSuccess }: RegisterPageProps) {
  const { addOccurrence } = useApp()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<OccurrenceCategory | "">("")
  const [priority, setPriority] = useState<Priority>("media")
  const [address, setAddress] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng })
    toast.success("Localização selecionada!", {
      description: "Você pode ajustar clicando em outro ponto do mapa",
    })
  }, [])

  const handleAddressSearch = async () => {
    if (!address.trim()) {
      toast.error("Digite um endereço")
      return
    }

    try {
      // Using Nominatim for geocoding (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address + ", São Paulo, Brasil"
        )}&limit=1`
      )
      const data = await response.json()

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0]
        setSelectedLocation({ lat: parseFloat(lat), lng: parseFloat(lon) })
        
        // Extract neighborhood from display_name
        const parts = display_name.split(", ")
        if (parts.length > 2) {
          setNeighborhood(parts[1] || parts[2])
        }
        
        toast.success("Endereço encontrado!", {
          description: "Localização atualizada no mapa",
        })
      } else {
        toast.error("Endereço não encontrado", {
          description: "Tente ser mais específico ou selecione no mapa",
        })
      }
    } catch {
      toast.error("Erro ao buscar endereço", {
        description: "Tente novamente ou selecione manualmente no mapa",
      })
    }
  }

  const handleUseMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelectedLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          toast.success("Localização obtida!", {
            description: "Sua localização atual foi selecionada",
          })
        },
        () => {
          toast.error("Erro ao obter localização", {
            description: "Verifique as permissões do navegador",
          })
        }
      )
    } else {
      toast.error("Geolocalização não suportada", {
        description: "Seu navegador não suporta geolocalização",
      })
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!title.trim()) {
      toast.error("Preencha o título da ocorrência")
      return
    }
    if (!description.trim()) {
      toast.error("Preencha a descrição da ocorrência")
      return
    }
    if (!category) {
      toast.error("Selecione uma categoria")
      return
    }
    if (!selectedLocation) {
      toast.error("Selecione a localização no mapa")
      return
    }

    setIsSubmitting(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    addOccurrence({
      title: title.trim(),
      description: description.trim(),
      category,
      status: "pendente",
      initialPriority: priority,
      neighborhood: neighborhood || "Centro",
      address: address || "Endereço não especificado",
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      imageUrl: imagePreview || undefined,
    })

    toast.success("Ocorrência registrada com sucesso!", {
      description: "Sua denúncia foi adicionada ao sistema",
    })

    // Reset form
    setTitle("")
    setDescription("")
    setCategory("")
    setPriority("media")
    setAddress("")
    setNeighborhood("")
    setSelectedLocation(null)
    setImagePreview(null)
    setIsSubmitting(false)

    if (onSuccess) {
      onSuccess()
    }
  }

  const isFormValid = title.trim() && description.trim() && category && selectedLocation

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Registrar Ocorrência</h1>
        <p className="text-muted-foreground mt-2">
          Registre problemas na infraestrutura urbana para que a comunidade possa validar e acompanhar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
            <CardDescription>
              Descreva o problema encontrado na infraestrutura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Buraco perigoso na calçada"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">{title.length}/100 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva o problema em detalhes: localização exata, tamanho aproximado, riscos observados..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{description.length}/500 caracteres</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as OccurrenceCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade Inicial</Label>
                <div className="flex gap-2">
                  {(["baixa", "media", "alta"] as Priority[]).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={priority === p ? "default" : "outline"}
                      className={`flex-1 ${
                        priority === p
                          ? p === "alta"
                            ? "bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                            : p === "media"
                            ? "bg-[#FB923C] hover:bg-[#F97316] text-white"
                            : "bg-[#FDE047] hover:bg-[#FACC15] text-black"
                          : ""
                      }`}
                      onClick={() => setPriority(p)}
                    >
                      {priorityLabels[p]}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  A prioridade final será definida pela comunidade
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Imagem</CardTitle>
            <CardDescription>
              Adicione uma foto do problema (opcional, mas recomendado)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
              {imagePreview ? (
                <div className="relative w-full max-w-md">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setImagePreview(null)}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Clique para enviar uma imagem</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 5MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Localização *</CardTitle>
            <CardDescription>
              Informe o endereço ou selecione diretamente no mapa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Digite o endereço (ex: Av. Paulista, 1000)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddressSearch()
                    }
                  }}
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleAddressSearch}>
                <MapPin className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button type="button" variant="outline" onClick={handleUseMyLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Minha localização</span>
                <span className="sm:hidden">GPS</span>
              </Button>
            </div>

            {neighborhood && (
              <p className="text-sm text-muted-foreground">
                Bairro detectado: <span className="font-medium text-foreground">{neighborhood}</span>
              </p>
            )}

            <div className="h-[400px] rounded-lg overflow-hidden border border-border">
              <MapComponent
                occurrences={[]}
                onViewDetails={() => {}}
                selectedLocation={selectedLocation}
                onMapClick={handleMapClick}
                isSelectionMode={true}
              />
            </div>

            {selectedLocation ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Localização selecionada: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Clique no mapa para selecionar a localização da ocorrência
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !isFormValid}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Registrar Ocorrência
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
