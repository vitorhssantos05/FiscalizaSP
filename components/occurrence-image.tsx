"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

interface OccurrenceImageProps {
  src?: string
  alt: string
  className: string
  fallbackClassName: string
}

export function OccurrenceImage({
  src,
  alt,
  className,
  fallbackClassName,
}: OccurrenceImageProps) {
  const [hasFailed, setHasFailed] = useState(false)

  if (!src || hasFailed) {
    return (
      <div
        className={fallbackClassName}
        role="img"
        aria-label="Imagem não disponível"
      >
        <ImageIcon aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasFailed(true)}
    />
  )
}
