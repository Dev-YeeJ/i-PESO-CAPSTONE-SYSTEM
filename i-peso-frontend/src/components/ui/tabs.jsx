import * as React from "react"
import { cn } from "@/lib/utils"

// shadcn/ui-style Tabs, hand-authored without @radix-ui/react-tabs (avoids a
// new dependency for a page-local control). Same visual language and API
// shape (Tabs/TabsList/TabsTrigger/TabsContent) as shadcn's own component —
// swap in the Radix version later with no call-site changes if ever needed.

const TabsContext = React.createContext(null)

function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internal, setInternal] = React.useState(defaultValue)
  const active = value ?? internal
  const setActive = onValueChange ?? setInternal

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn("w-full", className)} {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={cn(
      "inline-flex h-11 items-center gap-1 rounded-xl bg-slate-100 p-1 text-slate-600",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.active === value

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx?.setActive(value)}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
        isActive ? "bg-white text-brand-navy shadow-sm" : "text-slate-500 hover:text-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  if (ctx?.active !== value) return null

  return (
    <div ref={ref} role="tabpanel" className={cn("mt-5 focus-visible:outline-none", className)} {...props}>
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
