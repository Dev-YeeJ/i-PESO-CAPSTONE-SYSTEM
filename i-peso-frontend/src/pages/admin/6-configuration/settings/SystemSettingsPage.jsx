import { useState } from 'react'
import { PageHeader } from '@/pages/admin/_components'

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    site_name: 'i-PESO Employment Portal',
    site_email: 'admin@ipeso.gov.ph',
    max_file_upload_mb: 10,
    session_timeout_minutes: 30,
    password_min_length: 8,
    require_email_verification: true,
    maintenance_mode: false,
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="System Settings"
        subtitle="Configure general system preferences"
      />

      <div className="mt-8 max-w-2xl bg-white shadow rounded-lg p-8">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Site Name</label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Admin Email</label>
            <input
              type="email"
              value={settings.site_email}
              onChange={(e) => setSettings({ ...settings, site_email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>

          {/* File Upload Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max File Upload (MB)
            </label>
            <input
              type="number"
              value={settings.max_file_upload_mb}
              onChange={(e) =>
                setSettings({ ...settings, max_file_upload_mb: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>

          {/* Session Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={settings.session_timeout_minutes}
              onChange={(e) =>
                setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>

          {/* Password Min Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password Min Length
            </label>
            <input
              type="number"
              value={settings.password_min_length}
              onChange={(e) =>
                setSettings({ ...settings, password_min_length: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.require_email_verification}
                onChange={(e) =>
                  setSettings({ ...settings, require_email_verification: e.target.checked })
                }
                className="rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Require Email Verification</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) =>
                  setSettings({ ...settings, maintenance_mode: e.target.checked })
                }
                className="rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Settings
            </button>
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          {saved && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              Settings saved successfully!
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
