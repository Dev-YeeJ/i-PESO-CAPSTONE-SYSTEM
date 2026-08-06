import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'

/**
 * ConfirmModal — gate for destructive or irreversible admin actions.
 *
 * Set `requiresReason` to collect remarks, and `reasonRequired` when the action
 * must not proceed without them (rejections the constituent will read). The
 * confirm button stays disabled until a reason is supplied in that case.
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  requiresReason = false,
  reasonRequired = false,
  reasonLabel,
  reasonPlaceholder = 'Enter your remarks here...',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  loading = false,
}) {
  const [remarks, setRemarks] = useState('')
  const [wasOpen, setWasOpen] = useState(isOpen)
  const dialogRef = useRef(null)

  const handleCancel = useCallback(() => {
    if (loading) return
    setRemarks('')
    onCancel()
  }, [loading, onCancel])

  useEffect(() => {
    if (!isOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleCancel()
    }

    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleCancel])

  // Clear on open rather than on close, so a failed confirm keeps what was typed.
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen)
    if (isOpen && remarks !== '') setRemarks('')
  }

  if (!isOpen) return null

  const missingReason = requiresReason && reasonRequired && remarks.trim() === ''

  const handleConfirm = () => {
    if (missingReason || loading) return
    onConfirm(requiresReason ? remarks.trim() : undefined)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && handleCancel()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white shadow-xl outline-none"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4">
          {isDangerous && (
            <span className="rounded-xl bg-red-50 p-2 text-red-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <h2 id="confirm-modal-title" className="mt-1 text-lg font-bold text-slate-950">{title}</h2>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm leading-6 text-slate-600">{message}</p>

          {requiresReason && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                {reasonLabel ?? (reasonRequired ? 'Reason (required)' : 'Remarks (optional)')}
              </span>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder={reasonPlaceholder}
                rows={4}
                maxLength={3000}
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
              />
              {missingReason && (
                <span className="mt-1 block text-xs font-semibold text-red-600">
                  A reason is required before continuing.
                </span>
              )}
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={isDangerous ? 'danger' : 'navy'}
            size="sm"
            onClick={handleConfirm}
            disabled={loading || missingReason}
          >
            {loading ? 'Working…' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
