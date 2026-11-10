import { useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ImageUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CompanyLogo from '@/components/employers/CompanyLogo'
import { cn } from '@/lib/utils'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }

const rejectionText = (rejection) => {
  const code = rejection?.errors?.[0]?.code
  if (code === 'file-too-large') return 'That image is over 5 MB. Choose a smaller one.'
  if (code === 'file-invalid-type') return 'Choose a JPG, PNG or WebP image.'
  return 'That file could not be used.'
}

/** Drag-and-drop logo upload with a live preview of how it will look. */
export default function LogoUploadDialog({ open, onOpenChange, currentUrl, companyName, onUpload }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const reset = () => { setFile(null); setError(''); setProgress(null) }
  const uploading = progress !== null

  const { getRootProps, getInputProps, isDragActive, open: browse } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_BYTES,
    multiple: false,
    noClick: !!file,
    disabled: uploading,
    onDropAccepted: ([accepted]) => { setError(''); setFile(accepted) },
    onDropRejected: ([rejection]) => setError(rejectionText(rejection)),
  })

  const submit = async () => {
    if (!file) return
    setProgress(0)
    try {
      await onUpload(file, setProgress)
      reset()
      onOpenChange(false)
    } catch (err) {
      setProgress(null)
      setError(err?.response?.data?.errors?.company_logo?.[0] ?? err?.response?.data?.message ?? 'The logo could not be uploaded. Try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (uploading) return; if (!next) reset(); onOpenChange(next) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Company logo</DialogTitle>
          <DialogDescription>Shown on your job posts, your company page and the Smart Job Map. A square image works best.</DialogDescription>
        </DialogHeader>

        <div
          {...getRootProps({
            className: cn(
              'relative flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition',
              isDragActive ? 'border-brand-gold bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-brand-navy/50',
              !file && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
            ),
          })}
        >
          <input {...getInputProps()} aria-label="Choose a logo image" />
          <AnimatePresence mode="wait" initial={false}>
            {preview ? (
              <Motion.div key="preview" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="flex flex-col items-center gap-4">
                <div className="flex items-end gap-5">
                  <figure className="flex flex-col items-center gap-1.5">
                    <img src={preview} alt="New logo preview" className="h-28 w-28 rounded-2xl border-4 border-white bg-white object-contain p-1.5 shadow-lg" />
                    <figcaption className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Profile</figcaption>
                  </figure>
                  <figure className="flex flex-col items-center gap-1.5">
                    <img src={preview} alt="" className="h-12 w-12 rounded-xl border-2 border-white bg-white object-contain p-1 shadow" />
                    <figcaption className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Job card</figcaption>
                  </figure>
                </div>
                <p className="max-w-xs truncate text-sm font-semibold text-slate-700">{file?.name}</p>
                {!uploading && (
                  <Button size="sm" variant="outline" icon={RefreshCw} onClick={browse}>Choose another</Button>
                )}
              </Motion.div>
            ) : (
              <Motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                {currentUrl
                  ? <CompanyLogo src={currentUrl} name={companyName} size="lg" />
                  : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand-navy shadow"><ImageUp className="h-7 w-7" aria-hidden /></span>}
                <p className="text-sm font-bold text-slate-800">{isDragActive ? 'Drop the image here' : 'Drag an image here, or click to choose'}</p>
                <p className="text-xs text-slate-500">JPG, PNG or WebP · up to 5 MB</p>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {uploading && (
          <div role="progressbar" aria-label="Uploading logo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-slate-100">
            <Motion.div className="h-full rounded-full bg-brand-navy" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut' }} />
          </div>
        )}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <DialogFooter>
          <Button variant="outline" disabled={uploading} onClick={() => { reset(); onOpenChange(false) }}>Cancel</Button>
          <Button loading={uploading} disabled={!file} onClick={submit}>{uploading ? `Uploading ${progress}%` : 'Save logo'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
