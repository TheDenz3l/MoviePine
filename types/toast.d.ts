declare module '@/components/ui/toast' {
  import * as React from 'react'
  export interface Toast { id: string; message: string; type?: 'success'|'error'|'info'; ttl?: number }
  export function ToastProvider(props: { children: React.ReactNode }): React.ReactElement
  export function useToast(): { push: (t: Omit<Toast,'id'>) => void }
}
