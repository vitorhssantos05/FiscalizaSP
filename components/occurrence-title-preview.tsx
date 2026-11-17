"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function OccurrenceTitlePreview({ title, onSelect, children }: {
  title: string
  onSelect: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const suppressClick = useRef(false)
  const touchPointer = useRef(false)

  const close = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setOpen(false)
  }

  useEffect(() => {
    const release = () => close()
    window.addEventListener("pointerup", release)
    window.addEventListener("pointercancel", release)
    window.addEventListener("blur", release)
    window.addEventListener("scroll", release, true)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      window.removeEventListener("pointerup", release)
      window.removeEventListener("pointercancel", release)
      window.removeEventListener("blur", release)
      window.removeEventListener("scroll", release, true)
    }
  }, [])

  return (
    <Tooltip open={open} onOpenChange={(nextOpen) => { if (!touchPointer.current || !nextOpen) setOpen(nextOpen) }}>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`Localizar ${title} na lista`}
          className="min-w-0 select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring touch-pan-y [-webkit-touch-callout:none]"
          onPointerDown={(event) => {
            close()
            suppressClick.current = false
            touchPointer.current = event.pointerType !== "mouse"
            if (!touchPointer.current || !event.isPrimary) return
            origin.current = { x: event.clientX, y: event.clientY }
            timer.current = setTimeout(() => {
              suppressClick.current = true
              setOpen(true)
            }, 500)
          }}
          onPointerMove={(event) => {
            if (touchPointer.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) {
              suppressClick.current = true
              close()
            }
          }}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") touchPointer.current = false }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) { touchPointer.current = false; setOpen(true) }
          }}
          onPointerLeave={close}
          onPointerCancel={() => { suppressClick.current = true; close() }}
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault()
            close()
            if (!suppressClick.current) onSelect()
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            if (event.key === "Escape") close()
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              close()
              onSelect()
            }
          }}
          onBlur={close}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} collisionPadding={12} className="max-w-[min(24rem,calc(100vw-1.5rem))] break-words whitespace-normal text-sm leading-relaxed">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}
