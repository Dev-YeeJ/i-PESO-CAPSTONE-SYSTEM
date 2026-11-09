import { useState } from 'react'
import { Check, Copy, MailWarning } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Only shown when the account email failed to send: the one time the
 * temporary password is visible, so the admin can hand it over in person.
 */
export default function TemporaryPasswordDialog({ result, onClose }) {
  const [copied, setCopied] = useState(false)
  const open = !!result?.temporary_password

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporary_password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <MailWarning className="h-5 w-5" />
          </div>
          <DialogTitle>The email could not be sent</DialogTitle>
          <DialogDescription>
            Give {result?.staff?.name ?? 'them'} this temporary password in person. It is shown only once, works for 3 days,
            and they will set their own password when they sign in at <strong>/administrator</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{result?.staff?.email}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Temporary password</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <code className="select-all break-all font-mono text-lg font-bold tracking-wide text-slate-950">{result?.temporary_password}</code>
            <Button variant="outline" size="sm" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
