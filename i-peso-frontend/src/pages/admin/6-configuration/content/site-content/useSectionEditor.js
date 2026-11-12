import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminSiteContentService } from '@/services/siteContentService'
import { apiMessage, changedKeys, fieldErrorsOf, isConflict } from './formStyles'

/**
 * Shared editing state for a Content Modules section (About PESO, Welcome
 * screens…): the form, field errors, "what changed", save with the version
 * the editor loaded (409 → reload), and restore from history.
 * Mount the editor with `key={section.version}` so a save resets it.
 */
export default function useSectionEditor(sectionKey, section, { normalize = (values) => values } = {}) {
  const queryClient = useQueryClient()
  const saved = section.values
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const keys = Object.keys(section.labels)
  const values = normalize(form)
  const dirty = changedKeys(saved, values, keys)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-site-content'] })
    queryClient.invalidateQueries({ queryKey: ['site-content'] })
    queryClient.invalidateQueries({ queryKey: ['content-health'] })
    queryClient.invalidateQueries({ queryKey: ['admin-site-content-revisions', sectionKey] })
  }

  const onError = (error) => {
    setConfirmOpen(false)
    if (isConflict(error)) {
      toast.error(apiMessage(error, 'Someone else saved changes. Reloading.'))
      refresh()
      return
    }
    const fieldErrors = fieldErrorsOf(error)
    if (fieldErrors) setErrors(fieldErrors)
    toast.error(apiMessage(error, 'Could not save these changes.'))
  }

  const onSaved = (data) => {
    setConfirmOpen(false)
    setHistoryOpen(false)
    toast.success(data.message)
    refresh()
  }

  const save = useMutation({ mutationFn: () => adminSiteContentService.save(sectionKey, values, section.version), onSuccess: onSaved, onError })
  const restore = useMutation({ mutationFn: (revision) => adminSiteContentService.restore(sectionKey, revision.id, section.version), onSuccess: onSaved, onError })

  return {
    saved,
    form,
    setForm,
    set: (key, value) => setForm((current) => ({ ...current, [key]: value })),
    values,
    errors,
    err: (key) => errors[`values.${key}`],
    dirty,
    changes: dirty.map((key) => ({ key, label: section.labels[key], before: saved[key], after: values[key] })),
    discard: () => { setForm(saved); setErrors({}) },
    save,
    restore,
    confirmOpen,
    setConfirmOpen,
    historyOpen,
    setHistoryOpen,
  }
}
