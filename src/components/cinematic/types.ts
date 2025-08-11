export interface CinematicItemBase {
  id: string
  title?: string
  poster?: string
  backdrop?: string
  year?: number
  rating?: number
  genre?: string[]
  [key: string]: any
}

export interface CinematicConfig {
  card: { width: number; aspectRatio: number; gap: number; cornerRadius: number }
  preview: { enlarge: number; elevation: number; activationDelay: number; animationMs: number; dimOpacity: number }
  behavior: { virtualizationBufferPx: number; keyboardWrap: boolean; pointerIntentMs: number; retainPreviewMs: number }
}

export const defaultCinematicConfig: CinematicConfig = {
  card: { width: 204, aspectRatio: 2/3, gap: 12, cornerRadius: 8 },
  preview: { enlarge: 1.16, elevation: 22, activationDelay: 80, animationMs: 260, dimOpacity: 0.72 },
  behavior: { virtualizationBufferPx: 800, keyboardWrap: true, pointerIntentMs: 45, retainPreviewMs: 90 },
}
