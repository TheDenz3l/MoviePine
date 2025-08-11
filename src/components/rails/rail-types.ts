export interface RailItemBase {
  id: string
  title?: string
  poster?: string
  backdrop?: string
  year?: number
  rating?: number
  genre?: string[]
  [key: string]: any
}

export interface InteractionCallbacks {
  onPlay?: (id: string) => void
  onAdd?: (id: string) => void
  onInfo?: (id: string) => void
}

export interface AppleRailConfig {
  cardWidth: number
  aspectRatio: number // width / height
  gap: number
  previewEnlarge: number
  activationDelayMs: number
  animationMs: number
  dimOpacity: number
  focusElevation: number // px translateY lift negative
}

export const defaultAppleRailConfig: AppleRailConfig = {
  cardWidth: 204,
  aspectRatio: 2 / 3,
  gap: 16,
  previewEnlarge: 1.14,
  activationDelayMs: 70,
  animationMs: 260,
  dimOpacity: 0.75,
  focusElevation: 20,
}
