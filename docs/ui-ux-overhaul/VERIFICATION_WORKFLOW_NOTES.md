# Employer Verification Workflow — recommended changes

**Status:** the queue page (`VerificationQueuePage.jsx`) was reworked directly (TanStack Query, state primitives, ready-first ordering, doc-completeness bars). The **review/decision view lives in `EmployerDetailPage.jsx`, which is currently in your working tree**, so the changes below are **documented, not applied** — drop them in when the file is at a good point.

## What's already strong (do NOT rebuild)
Side-by-side layout · approve-by-default / reject-with-preset-reason table · approval progress bar · readiness checklist · adaptive approve/reject confirm dialog with missing-doc + active-vacancy warnings · watermarked doc preview (canvas burn-in + PDF overlay) · audit-logged download with mandatory purpose. This already meets/exceeds the brief's verification requirements.

## Gaps worth fixing (accessibility-shaped; all use primitives already in the repo)

### 1. Replace the two hand-rolled modals with the shadcn `Dialog` (highest value)
Both the **download modal** (`{downloadDocument && (…)}`, ~line 518) and the **confirmation dialog** (`{confirmDialog && (…)}`, ~line 558) are `fixed inset-0` divs. They close on backdrop click but have **no focus trap, no Esc-to-close, no focus restoration, and no `role="dialog"`/labelling** — keyboard and screen-reader users are stranded. The new `@/components/ui/dialog` (Radix) provides all of that for free.

Confirmation dialog, converted:
```jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

<Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{confirmDialog?.title}</DialogTitle>
      <DialogDescription>{confirmDialog?.message}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancel</Button>
      <Button
        variant={confirmDialog?.variant === 'approve' ? 'success' : 'danger'}
        onClick={confirmDialog?.onConfirm}
        disabled={actionLoading}
      >
        {actionLoading ? 'Processing…' : confirmDialog?.confirmLabel}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
Do the same for the download modal (its `<input>` for purpose becomes a labelled field inside `DialogContent`). Focus lands in the dialog, Esc closes it, and focus returns to the trigger on close.

### 2. Use the new `success` Button variant (added this session)
The approve button and the approve branch of the confirm dialog use `!important` overrides:
`className="… !border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700"`.
Replace with `variant="success"` (now available on the shared `Button`) — same look, no `!important`, on the semantic `success` token.

### 3. Loading / error states
- Loading (`if (loading) return <div …>Loading employer profile...</div>`, ~line 210) → `LoadingSkeleton` (e.g. a `card` + `text` composition) so the layout doesn't jump.
- Load failure (`if (!employer) return <div …>{error || 'Employer not found'}</div>`, ~line 211) → `<ErrorState description={error} onRetry={loadEmployer} />` so officers can retry without a full reload.

### 4. Optional: TanStack Query
`loadEmployer`/`useState`/`useEffect` can become `useQuery({ queryKey: ['admin','employer', id], queryFn: () => adminService.getEmployerDetail(id) })` for consistency with the dashboard/queue (caching + `refetch` for the retry above). Keep the local `decisions`/preview/download state as-is.

### 5. Audit history (needs backend)
The brief asks for an **audit trail** (who approved/rejected, when, prior remarks). Today the page shows only current status + "Registered/Last updated". If/when the API exposes a decision log (e.g. `employer.verification_history: [{ actor, action, reason, at }]`), render it as an `ActivityTimeline` in the right column. Flagged as a backend dependency — do not fabricate a history.

## Note on the watermark "protection"
The `Ctrl+S/P` blocking and right-click disable are deterrents, not security (trivially bypassed). That's fine as UX friction, but don't treat it as access control — real protection stays server-side (the audit-logged download already does this well).
