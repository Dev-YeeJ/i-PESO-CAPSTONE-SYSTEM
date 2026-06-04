import { useState } from 'react'
import { PageHeader, DataTable, ConfirmModal } from '@/pages/admin/_components'

export default function SMSNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState([
    {
      id: 1,
      campaign_name: 'New Job Postings Alert',
      recipients: 2450,
      sent_date: '2024-06-01',
      status: 'sent',
      open_rate: '65%',
    },
    {
      id: 2,
      campaign_name: 'Verification Reminder',
      recipients: 1200,
      sent_date: '2024-05-28',
      status: 'sent',
      open_rate: '58%',
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    campaign_name: '',
    recipients: 'all',
    message: '',
  })

  const handleSendBroadcast = () => {
    setBroadcasts([
      {
        id: broadcasts.length + 1,
        campaign_name: formData.campaign_name,
        recipients: Math.floor(Math.random() * 3000),
        sent_date: new Date().toISOString().split('T')[0],
        status: 'sent',
        open_rate: `${Math.floor(Math.random() * 40) + 50}%`,
      },
      ...broadcasts,
    ])
    setShowForm(false)
    setFormData({ campaign_name: '', recipients: 'all', message: '' })
  }

  const columns = [
    { key: 'campaign_name', label: 'Campaign', sortable: true },
    { key: 'recipients', label: 'Recipients', sortable: true },
    { key: 'sent_date', label: 'Sent Date', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    {
      key: 'open_rate',
      label: 'Open Rate',
      render: (value) => <span className="font-medium">{value}</span>,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="SMS Notifications"
        subtitle="Send bulk SMS campaigns to job seekers and employers"
      />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Campaigns</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{broadcasts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Sent</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {broadcasts.reduce((sum, b) => sum + b.recipients, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg Open Rate</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {(
              broadcasts.reduce((sum, b) => sum + parseFloat(b.open_rate), 0) / broadcasts.length
            ).toFixed(1)}
            %
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Broadcast History</h2>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Send Broadcast
          </button>
        </div>

        <DataTable columns={columns} data={broadcasts} />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Send SMS Broadcast</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
                <input
                  type="text"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  placeholder="e.g., New Job Postings Alert"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  rows={4}
                  placeholder="Enter SMS message (160 characters max)"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBroadcast}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
