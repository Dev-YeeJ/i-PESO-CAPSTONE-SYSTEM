import { Badge } from '@/components/ui'

export default function ConfirmationSlipPreview({ slip }) {
  if (!slip) return null

  return (
    <div className="space-y-6 p-1">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-3">Company Details</h4>
          <dl className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <dt className="font-semibold text-slate-500">Company Name</dt>
              <dd className="col-span-2 font-medium text-slate-900">{slip.company_name}</dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="font-semibold text-slate-500">Source</dt>
              <dd className="col-span-2 font-medium text-slate-900 capitalize">
                {slip.source?.replaceAll('_', ' ')}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-3">Representatives</h4>
          <dl className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <dt className="font-semibold text-slate-500">Rep 1</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {slip.representative_1_name}
                {slip.representative_1_contact && <span className="block text-xs text-slate-500">{slip.representative_1_contact}</span>}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="font-semibold text-slate-500">Position</dt>
              <dd className="col-span-2 font-medium text-slate-900">{slip.representative_position}</dd>
            </div>
            {slip.representative_2_name && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="font-semibold text-slate-500">Rep 2</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {slip.representative_2_name}
                  {slip.representative_2_contact && <span className="block text-xs text-slate-500">{slip.representative_2_contact}</span>}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-900">Pledged Vacancies</h4>
          <Badge variant="neutral">{slip.number_of_job_vacancies} Total Positions</Badge>
        </div>
        
        {slip.vacancies && slip.vacancies.length > 0 ? (
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {slip.vacancies.map((v, i) => (
              <div key={v.id || i} className="p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{v.position_title}</h5>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{v.qualifications}</p>
                    {v.place_of_work && (
                      <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide font-semibold">
                        📍 {v.place_of_work}
                      </p>
                    )}
                  </div>
                  <Badge variant="blue" className="shrink-0">{v.number_needed} slots</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-500 border border-slate-200 border-dashed rounded-xl">
            No specific vacancies encoded in this confirmation slip.
          </div>
        )}
      </div>
    </div>
  )
}
