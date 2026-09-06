import { useEffect, type RefObject } from 'react'

export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open || !ref.current) return
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(node => node.getClientRects().length > 0)
    focusable()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    dialog.addEventListener('keydown', trap)
    return () => { dialog.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus() }
  }, [open, ref])
}
