import Button from '@/components/ui/Button'

// `eyebrow` is accepted for compatibility but no longer shown: the top bar's
// breadcrumb already names the section, so a label above the title repeats it.
// eslint-disable-next-line no-unused-vars
export function PageHeader({ title, subtitle, actions = [], eyebrow }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="portal-title">{title}</h1>
        {subtitle && <p className="portal-subtitle">{subtitle}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              onClick={action.onClick}
              variant={action.variant === 'danger' ? 'danger' : action.variant === 'ghost' ? 'ghost' : action.variant === 'outline' ? 'outline' : 'primary'}
              size="sm"
              icon={action.icon}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PageHeader
