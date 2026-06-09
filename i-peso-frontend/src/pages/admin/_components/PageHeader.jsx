import Button from '@/components/ui/Button'

export function PageHeader({ title, subtitle, actions = [], eyebrow = 'PESO Operations' }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="portal-eyebrow">{eyebrow}</p>
        <h1 className="portal-title mt-1">{title}</h1>
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
