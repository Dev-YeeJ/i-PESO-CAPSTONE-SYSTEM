// i-peso-frontend/src/components/admin/ConfirmModal.jsx

import { useState, useCallback } from 'react'

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  requiresReason = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}) {
  const [remarks, setRemarks] = useState('')

  const handleConfirm = useCallback(() => {
    if (requiresReason) {
      onConfirm(remarks)
    } else {
      onConfirm()
    }
    setRemarks('')
  }, [remarks, requiresReason, onConfirm])

  const handleCancel = useCallback(() => {
    setRemarks('')
    onCancel()
  }, [onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600">{message}</p>

          {requiresReason && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Add remarks (optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter your remarks here..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal