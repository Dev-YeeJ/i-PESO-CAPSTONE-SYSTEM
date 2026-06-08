import { useEffect, useState } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { uploadProfileImage } from '@/services/seekerService'

export default function ProfilePhotoUploadModal({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return undefined
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!open) return null

  const selectFile = (event) => {
    const selected = event.target.files?.[0]
    setError('')

    if (!selected) return
    if (!['image/jpeg', 'image/png'].includes(selected.type)) {
      setError('Choose a JPG or PNG image.')
      return
    }
    if (selected.size > 2 * 1024 * 1024) {
      setError('The photo must not exceed 2 MB.')
      return
    }

    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(image.src)
      if (image.width !== image.height || image.width < 300) {
        setError('Use a square photo that is at least 300 by 300 pixels.')
        return
      }
      setFile(selected)
    }
    image.onerror = () => {
      URL.revokeObjectURL(image.src)
      setError('The selected image could not be read.')
    }
    image.src = URL.createObjectURL(selected)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Select your 2x2 photo first.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('profile_image', file)
      await uploadProfileImage(formData)
      onUploaded()
      setFile(null)
      onClose()
    } catch (requestError) {
      setError(
        requestError.response?.data?.errors?.profile_image?.[0]
        ?? requestError.response?.data?.message
        ?? 'Unable to upload your photo.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Upload 2x2 Photo</h2>
            <p className="mt-1 text-sm text-slate-500">This professional portrait will appear on your generated resume.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <label className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center hover:bg-blue-50">
          <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-slate-200 shadow-md">
            {preview
              ? <img src={preview} alt="Selected 2x2 preview" className="h-full w-full object-cover" />
              : <Camera className="h-12 w-12 text-slate-400" />}
          </div>
          <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">
            <Upload className="h-4 w-4" /> Choose Photo
          </span>
          <input type="file" accept="image/jpeg,image/png" onChange={selectFile} className="sr-only" />
        </label>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Use a recent square head-and-shoulders photo with a plain background, good lighting, and professional clothing. Minimum 300x300 pixels; maximum 2 MB.
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
          <button type="submit" disabled={saving || !file} className="flex-1 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Uploading...' : 'Use This Photo'}
          </button>
        </div>
      </form>
    </div>
  )
}
