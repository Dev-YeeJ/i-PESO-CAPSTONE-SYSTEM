import { useEffect, useState } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  Edit2,
  FileText,
  MapPin,
  Phone,
  Save,
  UsersRound,
  X,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as employerService from '@/services/employerService'
import * as employerProfileService from '@/services/employerProfileService'
import { useAuthStore } from '@/stores/authStore'
import { Button, LoadingSkeleton } from '@/components/ui'
import LazyImage from '@/components/common/LazyImage'
import ProfilePhotoUploadModal from '@/pages/seeker/components/ProfilePhotoUploadModal'
import { INDUSTRIES } from '@/utils/constants' // Wait, I might need to define this or import it if it doesn't exist, let's define it inside if needed.

export default function EmployerProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({})
  
  const [logoUploadOpen, setLogoUploadOpen] = useState(false)
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false)
  
  const updateUser = useAuthStore((state) => state.updateUser)

  const loadProfile = () => {
    employerService.getProfile()
      .then((data) => {
        setProfile(data.employer)
        setDraft(data.employer)
      })
      .catch((error) => toast.error(error.response?.data?.message ?? 'Unable to load profile.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await employerProfileService.updateProfile({
        industry: Array.isArray(draft.industry) ? draft.industry : [draft.industry],
        company_size: draft.company_size,
        company_description: draft.company_description,
        representative_name: draft.representative_name,
        representative_designation: draft.representative_designation,
        mobile_number: draft.mobile_number,
        representative_contact_number: draft.representative_contact_number,
      })
      setProfile(updated.employer)
      setEditing(false)
      toast.success('Profile updated successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file) => {
    try {
      const result = await employerProfileService.uploadCompanyLogo(file)
      setProfile((prev) => ({ ...prev, company_logo_url: result.company_logo_url }))
      updateUser({ employer: { ...profile, logo_url: result.company_logo_url } })
      setLogoUploadOpen(false)
      toast.success('Company logo updated.')
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to upload logo.')
      throw error // Let modal handle error state
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6"><LoadingSkeleton variant="card" rows={4} /></div>
  }

  if (!profile) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">Your profile could not be loaded.</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
      {/* Header / Banner area */}
      <div className="relative mb-24 rounded-3xl bg-gradient-to-r from-brand-navy to-brand-navy/80 px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{profile.company_name}</h1>
            <p className="mt-2 text-lg text-blue-100">{profile.trade_name ? `d/b/a ${profile.trade_name}` : profile.company_type.replace('_', ' ').toUpperCase()}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {editing ? (
              <>
                <Button onClick={() => { setEditing(false); setDraft(profile) }} variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-white text-brand-navy hover:bg-blue-50">
                  {saving ? <CheckCircle2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="bg-white text-brand-navy hover:bg-blue-50">
                <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Floating Logo */}
        <div className="absolute -bottom-16 left-6 sm:left-12">
          <div className="group relative h-32 w-32 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-40 sm:w-40">
            {profile.company_logo_url ? (
              <LazyImage src={profile.company_logo_url} alt="Company Logo" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-50">
                <Building2 className="h-16 w-16 text-slate-300" />
              </div>
            )}
            
            <button
              onClick={() => setLogoUploadOpen(true)}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera className="mb-2 h-8 w-8 text-white" />
              <span className="text-xs font-semibold text-white">Update Logo</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: About & Description */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* Company Details */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 flex items-center text-xl font-bold text-slate-900">
              <BriefcaseBusiness className="mr-3 h-6 w-6 text-brand-navy" /> Company Overview
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Company Description</label>
                {editing ? (
                  <textarea
                    rows={6}
                    value={draft.company_description ?? ''}
                    onChange={(e) => setDraft({ ...draft, company_description: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    placeholder="Tell us about your company..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-slate-600">
                    {profile.company_description || <span className="italic text-slate-400">No description provided.</span>}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Industry</label>
                  {editing ? (
                    <input
                      type="text"
                      value={Array.isArray(draft.industry) ? draft.industry[0] : draft.industry}
                      onChange={(e) => setDraft({ ...draft, industry: [e.target.value] })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
                    />
                  ) : (
                    <p className="font-medium text-slate-800">{Array.isArray(profile.industry) ? profile.industry.join(', ') : profile.industry}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Company Size</label>
                  {editing ? (
                    <select
                      value={draft.company_size ?? ''}
                      onChange={(e) => setDraft({ ...draft, company_size: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
                    >
                      <option value="micro">Micro (1-9 employees)</option>
                      <option value="small">Small (10-99 employees)</option>
                      <option value="medium">Medium (100-199 employees)</option>
                      <option value="large">Large (200+ employees)</option>
                    </select>
                  ) : (
                    <p className="font-medium capitalize text-slate-800">{profile.company_size}</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Contact & Location */}
        <div className="space-y-8">
          
          {/* Representative Details */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 flex items-center text-lg font-bold text-slate-900">
              <UsersRound className="mr-3 h-5 w-5 text-brand-navy" /> Representative
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={draft.representative_name ?? ''}
                    onChange={(e) => setDraft({ ...draft, representative_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                ) : (
                  <p className="font-medium text-slate-800">{profile.representative_name}</p>
                )}
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</label>
                {editing ? (
                  <input
                    type="text"
                    value={draft.representative_designation ?? ''}
                    onChange={(e) => setDraft({ ...draft, representative_designation: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                ) : (
                  <p className="font-medium text-slate-800">{profile.representative_designation}</p>
                )}
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                {editing ? (
                  <input
                    type="text"
                    value={draft.mobile_number ?? ''}
                    onChange={(e) => setDraft({ ...draft, mobile_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                ) : (
                  <p className="font-medium text-slate-800">{profile.mobile_number}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Alt Contact (Optional)</label>
                {editing ? (
                  <input
                    type="text"
                    value={draft.representative_contact_number ?? ''}
                    onChange={(e) => setDraft({ ...draft, representative_contact_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                ) : (
                  <p className="font-medium text-slate-800">{profile.representative_contact_number || '-'}</p>
                )}
              </div>
            </div>
          </section>

          {/* Location Details (Read-only for now) */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 flex items-center text-lg font-bold text-slate-900">
              <MapPin className="mr-3 h-5 w-5 text-brand-navy" /> Location
            </h2>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">{profile.house_unit_street}</p>
              <p className="text-sm font-medium text-slate-800">{profile.barangay}, {profile.city_municipality}</p>
              <p className="text-sm text-slate-600">{profile.province}</p>
              
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                To update your business address, please contact the PESO office to re-verify your registration documents.
              </div>
            </div>
          </section>

        </div>
      </div>

      {logoUploadOpen && (
        <ProfilePhotoUploadModal
          isOpen={logoUploadOpen}
          onClose={() => setLogoUploadOpen(false)}
          onUpload={handleLogoUpload}
          title="Update Company Logo"
          description="Upload a high-quality logo for your company. This will be displayed on your job postings."
        />
      )}
    </div>
  )
}
