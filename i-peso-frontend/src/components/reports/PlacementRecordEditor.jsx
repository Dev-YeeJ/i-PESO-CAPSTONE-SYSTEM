import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const cellInputClass = 'w-full min-w-[7rem] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-slate-200 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy/20'

export const blankPlacementRecord = () => ({
  first_name: '', middle_name: '', last_name: '', gender: '', civil_status: '', age: '',
  birth_date: '', date_hired: '', position: '', department: '', address: '',
  educational_attainment: '', assigned_company: '',
})

/** Drop rows nobody has typed anything into yet before sending to the server. */
export const stripBlankPlacementRecords = (records) => records.filter((row) => Object.values(row).some((value) => value))

/**
 * Per-hire register editor for a manually-entered Placement Report — the
 * "type it into a table" alternative to uploading a spreadsheet, mirroring
 * PlacementRecord::MAPPABLE_FIELDS one column per field. No column-mapping
 * step applies since a typed row is already in canonical field shape.
 */
export default function PlacementRecordEditor({ records, onChange }) {
  const update = (index, key, value) => onChange(records.map((row, i) => (i === index ? { ...row, [key]: value } : row)))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name *</TableHead>
              <TableHead>Middle Name</TableHead>
              <TableHead>Last Name *</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Civil Status</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Birth Date</TableHead>
              <TableHead>Date Hired *</TableHead>
              <TableHead>Position *</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Educational Attainment</TableHead>
              <TableHead>Assigned Company</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((row, index) => (
              <TableRow key={index}>
                <TableCell><input value={row.first_name} onChange={(e) => update(index, 'first_name', e.target.value)} placeholder="First name" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.middle_name} onChange={(e) => update(index, 'middle_name', e.target.value)} placeholder="Middle name" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.last_name} onChange={(e) => update(index, 'last_name', e.target.value)} placeholder="Last name" className={cellInputClass} /></TableCell>
                <TableCell>
                  <select value={row.gender} onChange={(e) => update(index, 'gender', e.target.value)} className={cellInputClass}>
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </TableCell>
                <TableCell><input value={row.civil_status} onChange={(e) => update(index, 'civil_status', e.target.value)} placeholder="e.g. Single" className={cellInputClass} /></TableCell>
                <TableCell><input type="number" min="15" max="100" value={row.age} onChange={(e) => update(index, 'age', e.target.value)} placeholder="Age" className={cellInputClass} /></TableCell>
                <TableCell><input type="date" value={row.birth_date} onChange={(e) => update(index, 'birth_date', e.target.value)} className={cellInputClass} /></TableCell>
                <TableCell><input type="date" value={row.date_hired} onChange={(e) => update(index, 'date_hired', e.target.value)} className={cellInputClass} /></TableCell>
                <TableCell><input value={row.position} onChange={(e) => update(index, 'position', e.target.value)} placeholder="Position" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.department} onChange={(e) => update(index, 'department', e.target.value)} placeholder="Department" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.address} onChange={(e) => update(index, 'address', e.target.value)} placeholder="Address" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.educational_attainment} onChange={(e) => update(index, 'educational_attainment', e.target.value)} placeholder="e.g. College Graduate" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.assigned_company} onChange={(e) => update(index, 'assigned_company', e.target.value)} placeholder="Assigned company" className={cellInputClass} /></TableCell>
                <TableCell>
                  <button type="button" onClick={() => onChange(records.filter((_, i) => i !== index))} aria-label="Remove hire" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button type="button" variant="outline" icon={Plus} onClick={() => onChange([...records, blankPlacementRecord()])}>Add Hire</Button>
    </div>
  )
}
