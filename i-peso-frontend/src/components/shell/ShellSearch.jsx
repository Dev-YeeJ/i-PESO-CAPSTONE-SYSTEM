import { createElement, isValidElement, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { CornerDownLeft, Loader2, Search } from 'lucide-react'
import { MIN_QUERY_LENGTH, RECORD_SEARCH, searchRecords } from './recordSearch'

const GROUP_CLASSES = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-500'
const ITEM_CLASSES = 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 data-[selected=true]:bg-[#e8f0fc] data-[selected=true]:text-brand-navy'

function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/**
 * Top-bar search field + ⌘K / Ctrl+K command palette shared by every portal shell.
 *
 * Always jumps to pages the signed-in account can open (each layout passes its
 * own permission-filtered nav groups). With `recordPortal` it also searches
 * records through that portal's search API: seekers, employers and postings
 * for staff; own vacancies and applicants for employers; open jobs and
 * programs for seekers.
 *
 * groups: [{ heading: string, items: [{ to, label, icon }] }]
 * `icon` may be a lucide component or an already-rendered element.
 */
export default function ShellSearch({ groups, placeholder = 'Search pages…', recordPortal }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const query = search.trim()
  const debounced = useDebounced(query)
  const recordConfig = recordPortal ? RECORD_SEARCH[recordPortal] : null

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const records = useQuery({
    queryKey: ['shellSearch', recordPortal, debounced],
    queryFn: ({ signal }) => searchRecords(recordPortal, debounced, signal),
    enabled: Boolean(recordConfig) && open && debounced.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
    retry: false,
  })

  // Filtering is done here rather than by cmdk, because record results come
  // from the server already matched and cmdk would hide them again.
  const pageGroups = useMemo(() => {
    const needle = query.toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => `${group.heading} ${item.label}`.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, query])

  // Only show results for what is typed now, not a stale earlier query.
  const recordGroups = records.data && debounced === query ? records.data : []
  const searching = Boolean(recordConfig) && query.length >= MIN_QUERY_LENGTH && (debounced !== query || records.isFetching)
  const nothingFound = !searching && pageGroups.length === 0 && recordGroups.length === 0

  const changeOpen = (next) => {
    setOpen(next)
    if (!next) setSearch('')
  }

  const go = (to) => {
    changeOpen(false)
    navigate(to)
  }

  const label = recordConfig ? 'Search' : 'Search pages'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden w-full max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-brand-canvas px-4 py-2.5 text-left text-sm text-slate-500 transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus md:flex"
        aria-label={`${label} (Ctrl+K)`}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="flex-1 truncate">{placeholder}</span>
        <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-500">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label={label}
      >
        <Search className="h-5 w-5" />
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={changeOpen}
        label={label}
        shouldFilter={false}
        overlayClassName="fixed inset-0 z-[60] bg-slate-950/40"
        contentClassName="fixed left-1/2 top-[12vh] z-[61] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          {searching
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
            : <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={placeholder}
            className="h-12 w-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">Esc</kbd>
        </div>
        <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {nothingFound && (
            <div className="px-3 py-8 text-center text-sm text-slate-500" role="status">
              {!recordConfig || query.length < MIN_QUERY_LENGTH ? 'No page matches that.' : 'Nothing matches that. Try a different name or word.'}
            </div>
          )}

          {recordGroups.map((group) => (
            <Command.Group key={`record-${group.key}`} heading={group.heading} className={GROUP_CLASSES}>
              {group.items.map((item) => {
                const type = recordConfig.types[item.type]
                if (!type) return null
                return (
                  <Command.Item
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => go(type.to(item.id))}
                    className={ITEM_CLASSES}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 [&_svg]:h-[18px] [&_svg]:w-[18px]">
                      {createElement(type.icon, { 'aria-hidden': true })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.title}</span>
                      {item.subtitle && <span className="block truncate text-xs font-normal text-slate-500">{item.subtitle}</span>}
                    </span>
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                  </Command.Item>
                )
              })}
            </Command.Group>
          ))}

          {pageGroups.map((group) => (
            <Command.Group key={group.heading} heading={recordGroups.length ? `Pages: ${group.heading}` : group.heading} className={GROUP_CLASSES}>
              {group.items.map((item) => (
                <Command.Item
                  key={item.to}
                  value={`page ${item.to}`}
                  onSelect={() => go(item.to)}
                  className={ITEM_CLASSES}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 [&_svg]:h-[18px] [&_svg]:w-[18px]">
                    {isValidElement(item.icon) ? item.icon : item.icon ? createElement(item.icon) : null}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <CornerDownLeft className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    </>
  )
}
