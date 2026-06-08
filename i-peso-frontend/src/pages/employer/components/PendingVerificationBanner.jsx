// src/pages/employer/components/PendingVerificationBanner.jsx
export default function PendingVerificationBanner({ status, rejectionReason }) {
  if (status === 'verified') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
        <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="font-semibold text-green-900">Account Verified!</h3>
          <p className="text-sm text-green-800">You can now post jobs and manage applications.</p>
        </div>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="font-semibold text-amber-900">Under Review</h3>
          <p className="text-sm text-amber-800">Your application is being verified by Urdaneta City PESO. This usually takes 2-3 business days.</p>
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900">Application Rejected</h3>
            <p className="text-sm text-red-800 mt-1">{rejectionReason}</p>
            <p className="text-sm text-red-700 mt-2">Please contact PESO for more information or to reapply.</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
