"use client"

import React, { ImgHTMLAttributes, useEffect, useRef, useState } from "react"

interface PosterImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError" | "src"> {
  src?: string | Blob
  fallbackSrc?: string
}

export default function PosterImage({ fallbackSrc = "/placeholder-movie.jpg", alt = "", className, src, ...rest }: PosterImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const isBlob = src instanceof Blob
  const desiredSrc: string | undefined = isBlob ? objectUrl ?? undefined : (src as string | undefined)
  const [activeSrc, setActiveSrc] = useState<string>(desiredSrc || fallbackSrc)
  const lastRequested = useRef<string | null>(desiredSrc || fallbackSrc)

  // Create/revoke object URL for Blob sources
  useEffect(() => {
    if (src instanceof Blob) {
      const url = URL.createObjectURL(src)
      setObjectUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setObjectUrl(null)
    }
  }, [src])

  // Preload next desired src and swap when ready
  useEffect(() => {
    const target = desiredSrc || fallbackSrc
    if (!target || target === activeSrc) return
    lastRequested.current = target
    const img = new Image()
    ;(img as any).decoding = "async"
    img.onload = () => {
      if (lastRequested.current === target) {
        requestAnimationFrame(() => setActiveSrc(target))
      }
    }
    img.onerror = () => {
      if (lastRequested.current === target) {
        requestAnimationFrame(() => setActiveSrc(fallbackSrc))
      }
    }
    img.src = target
  }, [desiredSrc, fallbackSrc, activeSrc])

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      draggable={false}
      decoding="async"
      {...rest}
    />
  )
}
