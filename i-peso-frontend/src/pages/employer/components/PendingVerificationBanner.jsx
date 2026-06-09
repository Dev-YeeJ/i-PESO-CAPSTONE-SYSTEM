import { AlertBox } from '@/components/ui'

export default function PendingVerificationBanner({ status, rejectionReason }) {
  if (status === 'verified') {
    return (
      <AlertBox variant="success" title="Employer account verified">
        PESO has approved your company requirements. Job posting and vacancy management are enabled.
      </AlertBox>
    )
  }

  if (status === 'pending') {
    return (
      <AlertBox title="Your accreditation is under PESO review">
        Urdaneta City PESO is reviewing your employer information and legal documents. You will receive an email and dashboard notification when the status changes.
      </AlertBox>
    )
  }

  if (status === 'rejected') {
    return (
      <AlertBox variant="danger" title="Your accreditation needs attention">
        {rejectionReason || 'Review the administrator feedback, correct your employer requirements, and submit them again.'}
      </AlertBox>
    )
  }

  return null
}
