import { useEffect, useState } from 'react'
import { getBarangaysByCity, getCitiesByProvince, getProvinces } from '@/services/psgcServices'

const selectClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100'

export default function PsgcCascade({
  province,
  provinceCode: initialProvinceCode,
  city,
  cityCode: initialCityCode,
  barangay,
  barangayCode,
  onChange,
}) {
  const [provinces, setProvinces] = useState([])
  const [cities, setCities] = useState([])
  const [barangays, setBarangays] = useState([])
  const [provinceCode, setProvinceCode] = useState(initialProvinceCode ?? '')
  const [cityCode, setCityCode] = useState(initialCityCode ?? '')
  const [loading, setLoading] = useState({ province: true, city: false, barangay: false })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getProvinces()
      .then((items) => {
        if (!active) return
        setProvinces(items)
        const selected = items.find((item) => item.name === province)
        if (selected) setProvinceCode(selected.code)
      })
      .catch(() => active && setError('Unable to load PSGC provinces.'))
      .finally(() => active && setLoading((current) => ({ ...current, province: false })))

    return () => {
      active = false
    }
  }, [province])

  useEffect(() => {
    if (!provinceCode) return
    let active = true

    getCitiesByProvince(provinceCode)
      .then((items) => {
        if (!active) return
        setCities(items)
        const selected = items.find((item) => item.name === city)
        if (selected) setCityCode(selected.code)
      })
      .catch(() => active && setError('Unable to load PSGC cities and municipalities.'))
      .finally(() => active && setLoading((current) => ({ ...current, city: false })))

    return () => {
      active = false
    }
  }, [provinceCode, city])

  useEffect(() => {
    if (!cityCode) return
    let active = true

    getBarangaysByCity(cityCode)
      .then((items) => active && setBarangays(items))
      .catch(() => active && setError('Unable to load PSGC barangays.'))
      .finally(() => active && setLoading((current) => ({ ...current, barangay: false })))

    return () => {
      active = false
    }
  }, [cityCode])

  const handleProvinceChange = (event) => {
    const code = event.target.value
    const selected = provinces.find((item) => item.code === code)
    setProvinceCode(code)
    setCityCode('')
    setCities([])
    setBarangays([])
    setLoading((current) => ({ ...current, city: true, barangay: false }))
    setError('')
    onChange({
      province: selected?.name ?? '',
      province_code: selected?.code ?? '',
      city: '',
      city_code: '',
      barangay: '',
      barangay_code: '',
    })
  }

  const handleCityChange = (event) => {
    const code = event.target.value
    const selected = cities.find((item) => item.code === code)
    setCityCode(code)
    setBarangays([])
    setLoading((current) => ({ ...current, barangay: true }))
    setError('')
    onChange({
      province,
      province_code: provinceCode,
      city: selected?.name ?? '',
      city_code: selected?.code ?? '',
      barangay: '',
      barangay_code: '',
    })
  }

  const handleBarangayChange = (event) => {
    const selected = barangays.find((item) => item.name === event.target.value)
    onChange({
      province,
      province_code: provinceCode,
      city,
      city_code: cityCode,
      barangay: selected?.name ?? '',
      barangay_code: selected?.code ?? '',
    })
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Province</label>
          <select value={provinceCode} onChange={handleProvinceChange} disabled={loading.province} className={selectClass}>
            <option value="">{loading.province ? 'Loading provinces...' : 'Select Province'}</option>
            {provinces.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">City/Municipality</label>
          <select value={cityCode} onChange={handleCityChange} disabled={!provinceCode || loading.city} className={selectClass}>
            <option value="">{loading.city ? 'Loading cities...' : 'Select City/Municipality'}</option>
            {cities.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Barangay</label>
          <select value={barangayCode || barangay} onChange={(event) => {
            const selected = barangays.find((item) => item.code === event.target.value)
            handleBarangayChange({ target: { value: selected?.name ?? '' } })
          }} disabled={!cityCode || loading.barangay} className={selectClass}>
            <option value="">{loading.barangay ? 'Loading barangays...' : 'Select Barangay'}</option>
            {barangays.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
