// Backward-compat shim: StatCard now lives in components/ui (shared across
// admin + portals). Existing `@/pages/admin/_components/StatCard` imports and
// `_components/index.js` resolve through here.
export { default } from '@/components/ui/StatCard'
