import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'
import Button from '@/components/ui/Button'

const isDev = import.meta.env?.DEV

export default function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const isResponse = isRouteErrorResponse(error)
  const title = isResponse ? `${error.status} ${error.statusText}` : 'Something went wrong'
  const description = isResponse
    ? (error.data?.message || 'The page you were looking for could not be loaded.')
    : "We hit an unexpected error and couldn't load this page. You can try again or head back home."
  const detail = isDev && !isResponse ? (error?.stack || error?.message || String(error)) : null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" icon={RotateCw} onClick={() => navigate(0)}>Try again</Button>
        <Button variant="navy" icon={Home} onClick={() => navigate('/')}>Go home</Button>
      </div>

      {detail && (
        <pre className="mt-6 max-w-xl overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-left text-xs text-slate-100">
          {detail}
        </pre>
      )}
    </div>
  )
}
