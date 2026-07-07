import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ISO_COUNTRIES } from '@/data/jobPreferenceVocabularies'
import { getCitiesByProvince, getProvinces } from '@/services/psgcServices'

export default function PreferredLocationsField({ scope, value = [], onChange, error }) {
  const [provinces, setProvinces] = useState([])
  const [provinceCode, setProvinceCode] = useState('')
  const [cities, setCities] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [country, setCountry] = useState('')
  const selectedProvince = useMemo(
    () => provinces.find((item) => item.code === provinceCode),
    [provinceCode, provinces],
  )

  useEffect(() => {
    getProvinces().then(setProvinces).catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    if (!provinceCode) return

    getCitiesByProvince(provinceCode)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setCityLoading(false))
  }, [provinceCode])

  const add = (location) => {
    const clean = String(location ?? '').trim()
    if (!clean || value.length >= 3 || value.some((item) => item.toLowerCase() === clean.toLowerCase())) return
    onChange([...value, clean])
  }

  const addCity = (cityCode) => {
    const city = cities.find((item) => item.code === cityCode)
    if (city && selectedProvince) add(`${city.name}, ${selectedProvince.name}`)
  }

  const addCountry = () => {
    add(country)
    setCountry('')
  }

  if (!scope) return null

  return (
    <div className={`rounded-xl border bg-slate-50 p-4 ${error ? 'border-red-300' : 'border-slate-200'}`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-600">
        Preferred {scope === 'local' ? 'cities or municipalities' : 'countries'} (up to 3)
      </p>

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
              {item}
              <button type="button" onClick={() => onChange(value.filter((location) => location !== item))} aria-label={`Remove ${item}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {scope === 'local' ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select value={provinceCode} disabled={value.length >= 3} onChange={(event) => {
            setProvinceCode(event.target.value)
            setCities([])
            setCityLoading(Boolean(event.target.value))
          }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20">
            <option value="">Select province</option>
            {provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
          </select>
          <select value="" disabled={!provinceCode || cityLoading || value.length >= 3} onChange={(event) => addCity(event.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20">
            <option value="">{cityLoading ? 'Loading cities...' : 'Select city or municipality'}</option>
            {cities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
          </select>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <input list="preferred-country-options" value={country} disabled={value.length >= 3} onChange={(event) => setCountry(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addCountry()
            }
          }} placeholder="Search country, e.g. Japan" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20" />
          <datalist id="preferred-country-options">
            {ISO_COUNTRIES.map((item) => <option key={item.code} value={item.name} />)}
          </datalist>
          <button type="button" onClick={addCountry} disabled={!country.trim() || value.length >= 3} className="rounded-lg bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-50">Add</button>
        </div>
      )}

      <p className={`mt-2 text-xs ${error ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
        {error || `${value.length} of 3 selected`}
      </p>
    </div>
  )
}
