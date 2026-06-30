import { useRef } from 'react'
import { Download, QrCode } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button, Card } from '@/components/ui'

export default function DigitalQRPass({ pass }) {
  const qrRef = useRef(null)

  if (!pass) return null

  const downloadPass = () => {
    const qrCanvas = qrRef.current?.querySelector('canvas')
    if (!qrCanvas) return

    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 540
    const context = canvas.getContext('2d')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#102a43'
    context.fillRect(0, 0, canvas.width, 96)
    context.fillStyle = '#f6c343'
    context.fillRect(0, 96, canvas.width, 8)

    context.fillStyle = '#ffffff'
    context.font = '700 34px Arial'
    context.fillText('i-PESO Digital Job Fair Pass', 40, 62)

    context.fillStyle = '#0f172a'
    context.font = '700 36px Arial'
    context.fillText(pass.event_name ?? 'Job Fair', 40, 160)
    context.font = '700 30px Arial'
    context.fillText(pass.name ?? 'Job Seeker', 40, 220)

    context.font = '20px Arial'
    context.fillStyle = '#475569'
    context.fillText(`Venue: ${pass.venue ?? 'TBD'}`, 40, 270)
    context.fillText(`Date: ${pass.start_date ?? 'TBD'}`, 40, 305)
    context.fillText(`NSRP Seeker ID: ${pass.seeker_id}`, 40, 340)

    context.font = '700 18px Arial'
    context.fillStyle = '#0f172a'
    context.fillText('Top Skills', 40, 395)
    context.font = '18px Arial'
    context.fillStyle = '#334155'
    context.fillText((pass.skills ?? []).slice(0, 5).join(', ') || 'Profile skills not listed', 40, 430)

    context.drawImage(qrCanvas, 620, 150, 220, 220)
    context.font = '14px Arial'
    context.fillStyle = '#64748b'
    context.fillText(pass.qr_code_uuid, 580, 405)

    const link = document.createElement('a')
    link.download = `i-peso-job-fair-pass-${pass.job_fair_id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <Card className="border-blue-200">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold uppercase text-blue-700">
            <QrCode className="h-4 w-4" /> Digital QR Pass
          </div>
          <h3 className="mt-2 text-xl font-black text-slate-950">{pass.event_name}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{pass.name}</p>
          <p className="mt-3 text-sm text-slate-500">{pass.venue} · {pass.start_date}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(pass.skills ?? []).slice(0, 5).map((skill) => (
              <span key={skill} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">{skill}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div ref={qrRef} className="rounded-lg border border-slate-200 bg-white p-3">
            <QRCodeCanvas value={pass.qr_code_uuid} size={164} includeMargin />
          </div>
          <Button variant="outline" size="sm" icon={Download} onClick={downloadPass}>Download Pass</Button>
        </div>
      </div>
    </Card>
  )
}
