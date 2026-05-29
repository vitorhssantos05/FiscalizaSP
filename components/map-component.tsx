"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Occurrence, Priority, OccurrenceStatus } from "@/lib/types"
import { categoryLabels, statusLabels, calculateDynamicPriority } from "@/lib/types"
import { MapPin, Info, ChevronDown, ChevronUp } from "lucide-react"

interface MapComponentProps {
  occurrences: Occurrence[]
  onViewDetails: (occurrence: Occurrence) => void
  selectedLocation?: { lat: number; lng: number } | null
  onMapClick?: (lat: number, lng: number) => void
  isSelectionMode?: boolean
}

// Cores da PRIORIDADE (cor interna do marcador)
const getPriorityFillColor = (priority: Priority): string => {
  switch (priority) {
    case "alta":
      return "#DC2626" // vermelho
    case "media":
      return "#FB923C" // laranja claro
    case "baixa":
      return "#FDE047" // amarelo claro
    default:
      return "#FB923C"
  }
}

// Cores do STATUS (cor da borda do marcador)
const getStatusBorderColor = (status: OccurrenceStatus): string => {
  switch (status) {
    case "resolvida":
      return "#16A34A" // verde
    case "em_analise":
      return "#2563EB" // azul
    case "pendente":
      return "#F97316" // laranja escuro
    default:
      return "#F97316"
  }
}

// Criar ícone customizado com prioridade (cor interna) e status (borda)
const createCustomIcon = (priority: Priority, status: OccurrenceStatus) => {
  const fillColor = getPriorityFillColor(priority)
  const borderColor = getStatusBorderColor(status)

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="marker-container" style="
        position: relative;
        width: 36px;
        height: 36px;
        transition: transform 0.3s ease, filter 0.3s ease;
      ">
        <div class="marker-pin" style="
          background-color: ${fillColor};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 4px solid ${borderColor};
          box-shadow: 0 3px 12px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          "></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

const selectionIcon = L.divIcon({
  className: "custom-marker selection-marker",
  html: `
    <div class="marker-container" style="
      position: relative;
      width: 36px;
      height: 36px;
    ">
      <div style="
        background-color: #3B82F6;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 4px solid white;
        box-shadow: 0 3px 12px rgba(59, 130, 246, 0.5), 0 1px 4px rgba(0,0,0,0.15);
        animation: marker-pulse 2s infinite;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
          margin: 8px auto;
        "></div>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap()
  
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
    
    map.on("click", handleClick)
    return () => {
      map.off("click", handleClick)
    }
  }, [map, onMapClick])
  
  return null
}

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1 })
  }, [map, lat, lng])
  
  return null
}

export function MapComponent({
  occurrences,
  onViewDetails,
  selectedLocation,
  onMapClick,
  isSelectionMode = false,
}: MapComponentProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [legendCollapsed, setLegendCollapsed] = useState(false) // Inicia aberto por padrão

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  const center: [number, number] = [-23.5505, -46.6333] // São Paulo center

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {isSelectionMode && onMapClick && (
          <MapClickHandler onMapClick={onMapClick} />
        )}
        
        {selectedLocation && (
          <>
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={selectionIcon}>
              <Popup>
                <div className="text-center p-2">
                  <p className="font-medium text-foreground">Local selecionado</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
            <FlyToLocation lat={selectedLocation.lat} lng={selectedLocation.lng} />
          </>
        )}
        
        {!isSelectionMode && occurrences.map((occurrence) => {
          const dynamicPriority = calculateDynamicPriority(occurrence.priorityVotes)
          const hasContestation = occurrence.status === "resolvida" && occurrence.contestations >= 1
          const hasExistenceContestation = occurrence.existenceContestations >= 3
          
          // Cores e labels para o popup
          const statusColor = occurrence.status === "resolvida" ? "#16A34A" : occurrence.status === "em_analise" ? "#2563EB" : "#F97316"
          const priorityColor = dynamicPriority === "alta" ? "#DC2626" : dynamicPriority === "media" ? "#FB923C" : "#A16207"
          const priorityBgColor = dynamicPriority === "alta" ? "rgba(220,38,38,0.15)" : dynamicPriority === "media" ? "rgba(251,146,60,0.15)" : "rgba(250,204,21,0.15)"
          const priorityLabel = dynamicPriority === "alta" ? "Alta" : dynamicPriority === "media" ? "Média" : "Baixa"
          
          return (
            <Marker
              key={`${occurrence.id}-${dynamicPriority}-${occurrence.status}-${occurrence.contestations}`}
              position={[occurrence.latitude, occurrence.longitude]}
              icon={createCustomIcon(dynamicPriority, occurrence.status)}
              eventHandlers={{
                click: () => {
                  // O popup será mostrado automaticamente pelo Leaflet
                }
              }}
            >
              <Popup className="custom-popup" maxWidth={300} minWidth={280}>
                <div className="popup-wrapper">
                  {/* Header com placeholder de imagem */}
                  <div className="popup-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="popup-header-icon">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  
                  {/* Corpo do popup */}
                  <div className="popup-body">
                    {/* Título */}
                    <h3 className="popup-title">{occurrence.title}</h3>
                    
                    {/* Categoria */}
                    <span className="popup-category">{categoryLabels[occurrence.category]}</span>
                    
                    {/* Local */}
                    <div className="popup-location">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span>{occurrence.neighborhood}</span>
                    </div>

                    {/* Badges */}
                    <div className="popup-badges">
                      <span className="popup-badge" style={{ backgroundColor: statusColor, color: 'white' }}>
                        {occurrence.status === "resolvida" && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        )}
                        {occurrence.status === "em_analise" && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        )}
                        {occurrence.status === "pendente" && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                        )}
                        {statusLabels[occurrence.status]}
                      </span>
                      <span className="popup-badge popup-badge-priority" style={{ backgroundColor: priorityBgColor, color: priorityColor, border: `1px solid ${priorityColor}30` }}>
                        {priorityLabel} prioridade
                      </span>
                    </div>

                    {/* Estatísticas */}
                    <div className="popup-stats">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 10v12"/>
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                      </svg>
                      <span>{occurrence.supports} apoios</span>
                    </div>

                    {/* Alertas */}
                    {hasContestation && (
                      <div className="popup-alert">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span>{occurrence.contestations} relato(s) de problema não resolvido</span>
                      </div>
                    )}
                    {hasExistenceContestation && (
                      <div className="popup-alert">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span>{occurrence.existenceContestations} contestação(ões) de existência</span>
                      </div>
                    )}

                    {/* Botão Ver Detalhes */}
                    <button
                      className="popup-button"
                      onClick={() => onViewDetails(occurrence)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Legenda do Mapa - Design Institucional Moderno */}
      {!isSelectionMode && (
        <div className="map-legend">
          {/* Cabeçalho da Legenda */}
          <button 
            className="legend-header w-full cursor-pointer sm:cursor-default"
            onClick={() => setLegendCollapsed(!legendCollapsed)}
          >
            <Info className="legend-header-icon" />
            <span className="flex-1 text-left">Legenda do Mapa</span>
            <span className="sm:hidden">
              {legendCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </span>
          </button>
          
          {/* Conteúdo colapsável - usa CSS para controlar visibilidade mobile/desktop */}
          <div className={`legend-content ${legendCollapsed ? 'legend-collapsed' : ''}`}>
          {/* Seção: Status (Borda do Marcador) */}
          <div className="legend-section">
            <h4 className="legend-section-title">Status (Borda)</h4>
            <div className="legend-items">
              {/* Resolvida */}
              <div className="legend-item">
                <div className="legend-marker-preview">
                  <div 
                    className="legend-marker-mini" 
                    style={{ 
                      backgroundColor: '#FDE047', 
                      borderColor: '#16A34A' 
                    }}
                  />
                </div>
                <div className="legend-item-info">
                  <span className="legend-item-label">Resolvida</span>
                  <span className="legend-item-color" style={{ color: '#16A34A' }}>Verde</span>
                </div>
              </div>
              {/* Pendente */}
              <div className="legend-item">
                <div className="legend-marker-preview">
                  <div 
                    className="legend-marker-mini" 
                    style={{ 
                      backgroundColor: '#FDE047', 
                      borderColor: '#F97316' 
                    }}
                  />
                </div>
                <div className="legend-item-info">
                  <span className="legend-item-label">Pendente</span>
                  <span className="legend-item-color" style={{ color: '#F97316' }}>Laranja</span>
                </div>
              </div>
              {/* Em Análise */}
              <div className="legend-item">
                <div className="legend-marker-preview">
                  <div 
                    className="legend-marker-mini" 
                    style={{ 
                      backgroundColor: '#FDE047', 
                      borderColor: '#2563EB' 
                    }}
                  />
                </div>
                <div className="legend-item-info">
                  <span className="legend-item-label">Em Análise</span>
                  <span className="legend-item-color" style={{ color: '#2563EB' }}>Azul</span>
                </div>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="legend-divider" />

          {/* Seção: Prioridade (Cor Interna) */}
          <div className="legend-section">
            <h4 className="legend-section-title">Prioridade (Cor Interna)</h4>
            <div className="legend-items">
              {/* Alta */}
              <div className="legend-item">
                <div className="legend-marker-preview">
                  <div 
                    className="legend-marker-mini" 
                    style={{ 
                      backgroundColor: '#DC2626', 
                      borderColor: '#16A34A' 
                    }}
                  />
                </div>
                <div className="legend-item-info">
                  <span className="legend-item-label">Alta</span>
                  <span className="legend-item-color" style={{ color: '#DC2626' }}>Vermelho</span>
                </div>
              </div>
              {/* Média */}
              <div className="legend-item">
                <div className="legend-marker-preview">
                  <div 
                    className="legend-marker-mini" 
                    style={{ 
                      backgroundColor: '#FB923C', 
                      borderColor: '#16A34A' 
                    }}
                  />
                </div>
                <div className="legend-item-info">
                  <span className="legend-item-label">Média</span>
                  <span className="legend-item-color" style={{ color: '#FB923C' }}>Laranja</span>
                </div>
              </div>
              {/* Baixa */}
              <div className="legend-item">
                <div className="legend-marker-preview">
                  <div 
                    className="legend-marker-mini" 
                    style={{ 
                      backgroundColor: '#FDE047', 
                      borderColor: '#16A34A' 
                    }}
                  />
                </div>
                <div className="legend-item-info">
                  <span className="legend-item-label">Baixa</span>
                  <span className="legend-item-color" style={{ color: '#FDE047' }}>Amarelo</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
