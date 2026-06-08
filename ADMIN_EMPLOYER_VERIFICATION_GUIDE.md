# Admin Employer Verification Portal Guide

## Overview

PESO staff use this portal to review and verify pending employer registrations before they can post jobs.

---

## Admin Portal Components

### 1. Pending Employers List
**Route**: `/admin/employers/pending`

**What it shows:**
- All employers with `verification_status = 'pending'`
- Sort by date (newest first)
- Quick status check for each employer

**Data displayed:**
```
- Employer ID
- Email
- Company Name
- Company Type
- Company Size
- Representative Name
- Date Submitted
- Documents Count
- Required Documents Status
- Action: Review Details
```

---

### 2. Employer Review Detail Page
**Route**: `/admin/employers/{employer_id}/review`

**Left Panel - Employer Information:**
```
Company Details:
  - Company Name: TechCorp Solutions Inc.
  - Trade Name: TechCorp
  - Company Type: Corporation / Partnership
  - Industry: IT
  - Company Size: Medium (50-199)
  - Address: 123 Tech Street, Rosario District, Urdaneta City, Pangasinan
  - Description: [Full text]

Representative:
  - Name: Juan Miguel Santos
  - Position: Human Resources Manager
  - Contact: 09123456789
  - Email: employer@company.com

Registration Date: June 6, 2026 10:00 AM
```

**Right Panel - Documents Checklist:**
```
Required Documents:
  ☐ Mayor's Permit
    └─ Uploaded: btn_view.pdf (June 6, 10:15 AM) [PENDING] [Approve] [Reject]
  
  ☐ BIR Certificate
    └─ Not Uploaded [MISSING]
  
  ☐ SEC Certificate
    └─ Uploaded: sec_reg.pdf (June 6, 10:30 AM) [PENDING] [Approve] [Reject]
  
  ☐ PRPA License
    └─ Uploaded: prpa_license.pdf (June 6, 10:45 AM) [PENDING] [Approve] [Reject]

Government ID:
  └─ Uploaded: gov_id.jpg (June 6, 11:00 AM) [PENDING] [View]

Authorization Letter:
  └─ Not Uploaded (Optional)
```

---

### 3. Document Viewer
- **View PDF inline** (embed or link to download)
- **View Images** (preview in modal)
- **Download document**
- **Add admin notes** (e.g., "Document is unclear, please resubmit")

---

### 4. Action Buttons

#### Approve Employer Button
```javascript
// When clicked:
1. Verify all required documents are uploaded
2. If missing documents → Show error: "Cannot approve. Missing: [list]"
3. If all good → Show confirmation: "Approve this employer?"
4. On confirm → Call API: POST /api/admin/employers/{id}/approve
5. Result: Status changes to "VERIFIED"
6. Show success message
7. Email sent to employer (auto-generated)
8. Redirect to pending list or next employer
```

**Email to Employer (Auto-sent):**
```
Subject: Your i-PESO Employer Account has been Verified!

Dear [Representative Name],

Your employer account registration has been reviewed and APPROVED!

Company: [Company Name]
Company Type: [Type]

You can now log in and post job listings. 

Start posting jobs: https://i-peso.example.com/employer/post-job

If you have questions, contact: admin@peso.gov.ph

Best regards,
Urdaneta City PESO
```

---

#### Reject Employer Button
```javascript
// When clicked:
1. Show modal with rejection reason textarea
2. Admin enters detailed reason (e.g., "SEC Certificate expired")
3. On submit → Call API: POST /api/admin/employers/{id}/reject
4. Result: Status changes to "REJECTED"
5. Email sent to employer with reason
6. Show option: "Notify employer" (default: yes)
7. Redirect to pending list
```

**Email to Employer (Auto-sent):**
```
Subject: Your i-PESO Employer Account Needs Attention

Dear [Representative Name],

Your employer account registration has been reviewed.

Unfortunately, we cannot approve your account at this time.

Company: [Company Name]

Reason for Rejection:
[Admin's detailed reason]

What to do next:
1. Update the required documents
2. Log in to your account and edit your profile
3. Re-upload the corrected documents
4. Resubmit for review

Contact for help: admin@peso.gov.ph

Best regards,
Urdaneta City PESO
```

---

## React Component Structure (Admin Portal)

### Main Admin Employer Component
**File**: `src/pages/admin/employers/EmployerVerification.jsx`

```jsx
import { useState, useEffect } from 'react'
import PendingEmployersList from './components/PendingEmployersList'
import EmployerReviewDetail from './components/EmployerReviewDetail'
import adminService from '../../../services/adminService'

export default function EmployerVerification() {
  const [selectedEmployer, setSelectedEmployer] = useState(null)
  const [pendingEmployers, setPendingEmployers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [employers, stats] = await Promise.all([
        adminService.getPendingEmployers(),
        adminService.getEmployerStats(),
      ])
      setPendingEmployers(employers)
      setStats(stats)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Employer Registration Verification</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
            <p className="text-gray-600 text-sm">Pending Review</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
            <p className="text-gray-600 text-sm">Verified</p>
            <p className="text-3xl font-bold text-green-600">{stats.verified || 0}</p>
          </div>
          <div className="bg-red-50 p-4 rounded border-l-4 border-red-400">
            <p className="text-gray-600 text-sm">Rejected</p>
            <p className="text-3xl font-bold text-red-600">{stats.rejected || 0}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
            <p className="text-gray-600 text-sm">Total Employers</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total || 0}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: List */}
        <div className="col-span-1">
          <PendingEmployersList
            employers={pendingEmployers}
            selectedEmployerId={selectedEmployer?.employer_id}
            onSelectEmployer={setSelectedEmployer}
            loading={loading}
          />
        </div>

        {/* Right: Detail */}
        <div className="col-span-2">
          {selectedEmployer ? (
            <EmployerReviewDetail
              employer={selectedEmployer}
              onApprove={() => {
                // Refresh list
                fetchData()
                setSelectedEmployer(null)
              }}
              onReject={() => {
                // Refresh list
                fetchData()
                setSelectedEmployer(null)
              }}
            />
          ) : (
            <div className="bg-gray-50 p-6 rounded text-center text-gray-500">
              Select an employer from the list to review
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Pending Employers List Component
**File**: `src/pages/admin/employers/components/PendingEmployersList.jsx`

```jsx
export default function PendingEmployersList({ employers, selectedEmployerId, onSelectEmployer, loading }) {
  if (loading) return <div className="text-center py-8">Loading...</div>

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <div className="bg-blue-600 text-white p-4 font-bold">
        Pending Employers ({employers.length})
      </div>
      
      <div className="divide-y max-h-96 overflow-y-auto">
        {employers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No pending employers</div>
        ) : (
          employers.map((employer) => (
            <div
              key={employer.employer_id}
              onClick={() => onSelectEmployer(employer)}
              className={`p-4 cursor-pointer hover:bg-blue-50 ${
                selectedEmployerId === employer.employer_id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
              }`}
            >
              <p className="font-bold text-sm">{employer.company_name}</p>
              <p className="text-xs text-gray-600">{employer.email}</p>
              <p className="text-xs text-gray-500 mt-1">{employer.company_type}</p>
              
              {/* Document Status */}
              <div className="mt-2 flex items-center text-xs">
                <span className={employer.all_required_uploaded ? 'text-green-600' : 'text-orange-600'}>
                  {employer.documents_count}/{employer.required_documents.length} docs
                </span>
              </div>
              
              <p className="text-xs text-gray-400 mt-1">
                {new Date(employer.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

---

### Employer Review Detail Component
**File**: `src/pages/admin/employers/components/EmployerReviewDetail.jsx`

```jsx
import { useState } from 'react'
import DocumentPreview from './DocumentPreview'
import RejectModal from './RejectModal'
import adminService from '../../../../services/adminService'

export default function EmployerReviewDetail({ employer, onApprove, onReject }) {
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)

  const handleApprove = async () => {
    if (!window.confirm('Approve this employer?')) return

    setApproving(true)
    try {
      await adminService.approveEmployer(employer.employer_id)
      setError('')
      // Show success
      alert('Employer approved successfully!')
      onApprove()
    } catch (err) {
      setError(err.message || 'Failed to approve')
    } finally {
      setApproving(false)
    }
  }

  const handleRejectSubmit = async (reason) => {
    try {
      await adminService.rejectEmployer(employer.employer_id, reason)
      setShowRejectModal(false)
      alert('Employer rejected. Email sent.')
      onReject()
    } catch (err) {
      alert('Failed to reject: ' + err.message)
    }
  }

  return (
    <div className="bg-white rounded shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">{employer.company_name}</h2>
          <p className="text-gray-600">{employer.email}</p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-semibold">
            Pending Review
          </span>
          <p className="text-xs text-gray-500 mt-2">{employer.company_type}</p>
        </div>
      </div>

      {/* Employer Info */}
      <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
        <div>
          <h3 className="font-bold mb-3">Company Information</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-600">Industry:</dt>
              <dd className="font-semibold">{employer.industry}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Company Size:</dt>
              <dd className="font-semibold">{employer.company_size}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Address:</dt>
              <dd className="font-semibold">{employer.complete_address}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="font-bold mb-3">Representative</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-600">Name:</dt>
              <dd className="font-semibold">
                {employer.representative_first_name} {employer.representative_last_name}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Position:</dt>
              <dd className="font-semibold">{employer.representative_designation}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Contact:</dt>
              <dd className="font-semibold">{employer.representative_contact_number}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Documents */}
      <div className="mb-6 pb-6 border-b">
        <h3 className="font-bold mb-3">Documents</h3>
        <div className="space-y-2">
          {employer.documents.map((doc) => (
            <div
              key={doc.document_id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100"
            >
              <div>
                <p className="font-semibold text-sm">{doc.document_type}</p>
                <p className="text-xs text-gray-600">{doc.original_filename}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    doc.verification_status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {doc.verification_status}
                </span>
                <button
                  onClick={() => setSelectedDocument(doc)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleApprove}
          disabled={approving}
          className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
        >
          {approving ? 'Approving...' : '✓ Approve Employer'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 font-semibold"
        >
          ✗ Reject Registration
        </button>
      </div>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          onSubmit={handleRejectSubmit}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </div>
  )
}
```

---

## Admin Service API Calls

**File**: `src/services/adminService.js`

```javascript
const API_URL = 'http://localhost:8000/api'

export const adminService = {
  getPendingEmployers: async (token) => {
    const response = await fetch(`${API_URL}/admin/employers/pending`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch employers')
    const data = await response.json()
    return data.employers
  },

  reviewEmployer: async (employerId, token) => {
    const response = await fetch(`${API_URL}/admin/employers/${employerId}/review`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Failed to get employer details')
    return response.json()
  },

  approveEmployer: async (employerId, token) => {
    const response = await fetch(`${API_URL}/admin/employers/${employerId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Failed to approve')
    return response.json()
  },

  rejectEmployer: async (employerId, reason, token) => {
    const response = await fetch(`${API_URL}/admin/employers/${employerId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rejection_reason: reason }),
    })
    if (!response.ok) throw new Error('Failed to reject')
    return response.json()
  },

  getEmployerStats: async (token) => {
    const response = await fetch(`${API_URL}/admin/employers/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Failed to get stats')
    return response.json()
  },
}

export default adminService
```

---

## Dashboard Integration

Add this menu item to admin sidebar:
```
Admin Dashboard
├── Dashboard
├── Job Seekers
├── Employer Verification ← NEW
│   ├── Pending Review
│   ├── Verified
│   └── Rejected
├── Programs
├── Job Fairs
├── Reports
└── Activity Logs
```

---

## Workflow Summary

```
1. Employer submits registration → Status: PENDING
2. Admin sees in "Pending Employers" list
3. Admin clicks to review details
4. Admin checks:
   - All required documents uploaded?
   - Documents look valid?
   - Representative info complete?
5. Admin decides:
   - APPROVE ✓ → Send approval email → Employer can now post jobs
   - REJECT ✗ → Send rejection email with reason → Employer can resubmit
```

---

**Admin Verification Portal - Ready to Build! 🚀**

