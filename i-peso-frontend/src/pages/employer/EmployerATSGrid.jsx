import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Filter, ChevronDown, CheckSquare, Square, 
  MapPin, GraduationCap, Calendar as CalendarIcon, Mail, Phone,
  CheckCircle2, XCircle, Clock, Video, UserCheck, Briefcase, ChevronRight,
  Sparkles, FileText, UserRound, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getEmployerApplicationDetail, getEmployerApplications, updateEmployerApplicationStatusBulk, connectGoogleCalendar } from '@/services/employerApplicationService';
import { useSearchParams, Link } from 'react-router-dom';

// Local-time "YYYY-MM-DD" for date `min` attributes — prevents scheduling in the past.
const todayLocalDate = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const PIPELINE_TABS = [
  { id: 'pending', label: 'Inbox' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview', label: 'Interview' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' }
];

const EMPLOYER_MISMATCH_REASONS = [
  ['salary_expectation_not_met', 'Salary expectation is not met'],
  ['lack_competencies_skills', 'Lack of competencies or skills'],
  ['lack_license_certification', 'Lack of professional license or TESDA certification'],
  ['documentary_requirements', 'Failed to submit documentary requirements'],
  ['other_reason', 'Other reason'],
];

const SEEKER_MISMATCH_REASONS = [
  ['', 'Not reported'],
  ['skill_mismatch', 'Skill mismatch'],
  ['transportation_location', 'Transportation or location issue'],
  ['working_environment', 'Working environment is not acceptable'],
  ['other_reason', 'Other reason'],
];

const statusTone = (status) => {
  switch (status) {
    case 'pending': return 'bg-slate-50 border-slate-200 text-slate-600';
    case 'reviewed': return 'bg-blue-50 border-blue-200 text-blue-700';
    case 'shortlisted': return 'bg-purple-50 border-purple-200 text-purple-700';
    case 'interview': return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'hired': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    case 'rejected': return 'bg-red-50 border-red-200 text-red-700';
    case 'withdrawn': return 'bg-slate-100 border-slate-300 text-slate-500';
    default: return 'bg-slate-50 border-slate-200 text-slate-600';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function EmployerATSGrid() {
  const [searchParams, setSearchParams] = useSearchParams();
  const vacancyId = searchParams.get('vacancy_id');

  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('match_score');
  
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailApplication, setDetailApplication] = useState(null);
  
  const queryClient = useQueryClient();
  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, payload }) => updateEmployerApplicationStatus(applicationId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employerApplications'] }),
  });

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'profile', 'interview', 'hire', 'reject'
  const [modalTarget, setModalTarget] = useState(null); // Single application or array of applications for bulk

  const interviewForm = useForm({
    defaultValues: { date: '', time: '', mode: 'online', autoMeet: true },
  });
  const { register: registerInterview, handleSubmit: handleSubmitInterview, watch: watchInterview, reset: resetInterview, getValues: getInterviewValues } = interviewForm;

  const hireForm = useForm({
    defaultValues: { startDate: '', salary: '', employmentType: 'regular' },
  });
  const { register: registerHire, reset: resetHire, getValues: getHireValues } = hireForm;

  const rejectionForm = useForm({
    defaultValues: { employerReason: EMPLOYER_MISMATCH_REASONS[0][0], seekerReason: '', details: '' },
  });
  const { register: registerRejection, reset: resetRejection, getValues: getRejectionValues } = rejectionForm;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const applicationsQuery = useQuery({
    queryKey: ['employerApplications', { per_page: 100 }],
    queryFn: () => getEmployerApplications({ per_page: 100 }),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const applications = applicationsQuery.data?.data || []
  const loading = applicationsQuery.isLoading
  const queryError = applicationsQuery.isError ? applicationsQuery.error : null
  const errorMessage = queryError?.response?.data?.message || 'Failed to load applications'

  // 1. Filtering & Sorting Logic
  const filteredApps = useMemo(() => {
    let filtered = applications.filter(app => app.status === activeTab);

    if (vacancyId) {
      filtered = filtered.filter(app => String(app.job?.post_id) === String(vacancyId));
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(app => {
        const seeker = app.seeker || {};
        const job = app.job || {};
        return (
          seeker.name?.toLowerCase().includes(q) ||
          seeker.skills?.join(' ').toLowerCase().includes(q) ||
          job.job_title?.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'match_score') {
        return (b.match_percentage || 0) - (a.match_percentage || 0);
      }
      if (sortBy === 'distance') {
        // Fallback to match_percentage if distance logic isn't fully implemented in data
        return (a.distance_km || 999) - (b.distance_km || 999);
      }
      return new Date(b.applied_at) - new Date(a.applied_at);
    });

    return filtered;
  }, [applications, activeTab, searchQuery, sortBy, vacancyId]);

  const tabCounts = useMemo(() => {
    const counts = {};
    PIPELINE_TABS.forEach(t => counts[t.id] = 0);
    applications.forEach(app => {
      if (counts[app.status] !== undefined) {
        counts[app.status]++;
      }
    });
    return counts;
  }, [applications]);

  // 2. Selection Logic
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApps.length && filteredApps.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApps.map(app => app.apply_id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // 3. Status Change Execution (The Engine)
  const executeStatusChange = async (targetStatus, payload = {}) => {
    setIsSubmitting(true);
    
    // Determine which applications to update
    const targets = Array.isArray(modalTarget) ? modalTarget : [modalTarget];
    
    /**
     * API HOOKS PREPARATION (DOLE SPRS & R.A. 10911 COMPLIANCE)
     * ---------------------------------------------------------
     * 1. Send the status change array to a bulk update endpoint.
     * 2. If targetStatus === 'hired', the payload must include DOLE Placement Capture data:
     *    { placement_start_date: hireForm.startDate, placement_salary: hireForm.salary, employment_type: hireForm.employmentType }
     *    -> The backend will deduct 1 from job vacancies_count.
     * 3. ANTI-GHOSTING SWEEP: If vacancies hit 0, the backend must automatically sweep all remaining 
     *    'pending', 'reviewed', 'shortlisted', and 'interview' candidates for this job and mark them 'rejected'.
     */

    try {
      const hireValues = getHireValues();
      const interviewValues = getInterviewValues();
      const rejectionValues = getRejectionValues();

      const updatePayload = { status: targetStatus, ...payload };
      
      if (targetStatus === 'hired') {
        updatePayload.placement_start_date = hireValues.startDate;
        updatePayload.placement_salary = hireValues.salary;
        updatePayload.employment_type = hireValues.employmentType;
      }
      
      if (targetStatus === 'interview') {
        updatePayload.interview = {
          schedule: `${interviewValues.date} ${interviewValues.time}`,
          mode_of_interview: interviewValues.mode,
          auto_meet_link: interviewValues.autoMeet,
        };
      }

      if (targetStatus === 'rejected') {
        updatePayload.employer_mismatch_reason_code = rejectionValues.employerReason;
        updatePayload.seeker_mismatch_reason_code = rejectionValues.seekerReason || null;
        updatePayload.mismatch_reason_details = rejectionValues.details || null;
        updatePayload.employer_remarks = rejectionValues.details || null;
      }

      updatePayload.application_ids = targets.map(app => app.apply_id);

      await updateEmployerApplicationStatusBulk(updatePayload);

      toast.success(`Successfully moved ${targets.length} candidates to ${targetStatus}`);
      
      // Close Modals & Clear Selection
      closeModal();
      setSelectedIds(new Set());
      await applicationsQuery.refetch(); // Refresh list to reflect changes

    } catch (err) {
      if (err.response?.status === 403 && (err.response?.data?.message?.includes('Google Calendar not connected') || err.response?.data?.message?.includes('token expired'))) {
        toast('Redirecting to connect Google Calendar...', { icon: '🗓️' });
        try {
          const { url } = await connectGoogleCalendar();
          window.location.href = url;
        } catch {
          toast.error('Failed to initiate Google Calendar connection.');
        }
      } else {
        toast.error(err.response?.data?.message || 'Action failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Modal Handlers
  const openProfileModal = async (app) => {
    setDetailLoading(true);
    setDetailApplication(null);
    setModalTarget(app);
    setActiveModal('profile');

    try {
      const data = await getEmployerApplicationDetail(app.apply_id);
      setDetailApplication(data.application);
      setModalTarget(data.application);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load applicant details.');
      setActiveModal(null);
      setModalTarget(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openBulkModal = (status) => {
    if (selectedIds.size === 0) return;
    const targets = applications.filter(a => selectedIds.has(a.apply_id));
    setModalTarget(targets);

    if (status === 'interview') setActiveModal('interview');
    else if (status === 'hired') setActiveModal('hire');
    else if (status === 'rejected') setActiveModal('reject');
    else executeStatusChange(status);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalTarget(null);
    setDetailApplication(null);
    resetInterview();
    resetHire();
    resetRejection();
  };

  // UI Helpers
  const getMatchColor = (score) => {
    if (score >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 75) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Applicant Tracking System</h1>
      </div>

      {/* PIPELINE TABS */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
        {PIPELINE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()); }}
            className={`flex items-center px-5 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
              ${activeTab === tab.id 
                ? 'border-blue-600 text-blue-700 bg-blue-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            {tab.label}
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-semibold
              ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
            `}>
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* VACANCY FILTER INDICATOR */}
      {vacancyId && (
        <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Showing applicants for a specific vacancy.</span>
          </div>
          <button 
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.delete('vacancy_id');
              setSearchParams(params);
            }} 
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, skills, or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={async () => {
              try {
                const { url } = await connectGoogleCalendar();
                window.location.href = url;
              } catch {
                toast.error('Failed to initiate Google Calendar connection.');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
          >
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            Connect Calendar
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-sm py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="match_score">Highest Match Score</option>
              <option value="distance">Closest Distance</option>
              <option value="applied_date">Date Applied (Newest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* HIGH-DENSITY DATA GRID */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.size === filteredApps.length && filteredApps.length > 0 ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Match</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Skills</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Education</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="py-8 text-center text-slate-500">Loading pipeline data...</td></tr>
              ) : filteredApps.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-500">No candidates found in this stage.</td></tr>
              ) : (
                filteredApps.map((app) => {
                  const isSelected = selectedIds.has(app.apply_id);
                  const seeker = app.seeker || {};
                  const skills = seeker.skills || [];
                  const topSkills = skills.slice(0, 3);
                  
                  return (
                    <tr 
                      key={app.apply_id} 
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => toggleSelect(app.apply_id)} className="text-slate-400 hover:text-blue-600">
                          {isSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <button 
                            onClick={() => openProfileModal(app)}
                            className="text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline text-left"
                          >
                            {seeker.name}
                          </button>
                          <Link to="/employer/vacancies" className="text-xs text-slate-500 hover:text-blue-600 flex items-center mt-0.5">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {app.job?.job_title}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getMatchColor(app.match_percentage)}`}>
                          {parseFloat(app.match_percentage).toFixed(1)}% Match
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {topSkills.map((s, i) => (
                            <span key={i} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                              {s}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                              +{skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm text-slate-700">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
                          <span className="truncate max-w-[150px]">{seeker.educ_attainment || 'Not specified'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-600 flex flex-col gap-1 items-start">
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                            {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {app.status === 'interview' && (
                            <Link to="/employer/calendar" className="flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                              <CalendarIcon className="h-3.5 w-3.5 mr-1" /> View in Calendar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STICKY BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 fade-in z-40">
          <div className="font-semibold whitespace-nowrap">
            {selectedIds.size} Selected
          </div>
          <div className="w-px h-6 bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 mr-2">Move to:</span>
            <button onClick={() => openBulkModal('reviewed')} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-200">
              Reviewed
            </button>
            <button onClick={() => openBulkModal('shortlisted')} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-200">
              Shortlist
            </button>
            <button onClick={() => openBulkModal('interview')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 transition-colors text-white">
              Interview
            </button>
            <button onClick={() => openBulkModal('hired')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 transition-colors text-white ml-2">
              Hire
            </button>
            <button onClick={() => openBulkModal('rejected')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 transition-colors ml-2">
              Reject
            </button>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL A: PROFILE REVEAL (R.A. 10911 COMPLIANCE)   */}
      {/* ================================================= */}
      {activeModal === 'profile' && modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Disclaimer Banner */}
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong className="font-semibold">Official HR Onboarding Data:</strong> Demographic data (Age, Gender) is now revealed in compliance with R.A. 10911. You are legally required to evaluate candidates strictly based on merit and the AI Match Score before viewing these details.
              </p>
            </div>
            
            <div className="p-8 max-h-[75vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{detailApplication?.seeker?.name || modalTarget?.seeker?.name}</h2>
                  <p className="text-blue-600 font-medium mt-1">Applying for: {detailApplication?.job?.job_title || modalTarget?.job?.job_title}</p>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(detailApplication?.status || modalTarget?.status)}`}>
                      {detailApplication?.status_label || modalTarget?.status_label || 'Status'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                      {Math.round(Number(detailApplication?.match_percentage ?? modalTarget?.match_percentage ?? 0))}% match
                    </span>
                    {((detailApplication?.status || modalTarget?.status) === 'withdrawn') && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">Withdrawn</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Contact & Summary</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-700"><Mail className="h-4 w-4 text-slate-400" /> {detailApplication?.seeker?.email || modalTarget?.seeker?.email}</div>
                      <div className="flex items-center gap-3 text-sm text-slate-700"><Phone className="h-4 w-4 text-slate-400" /> {detailApplication?.seeker?.mobile_number || modalTarget?.seeker?.mobile_number}</div>
                      <div className="flex items-center gap-3 text-sm text-slate-700"><MapPin className="h-4 w-4 text-slate-400" /> {detailApplication?.seeker?.address || modalTarget?.seeker?.address}</div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Applied on</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatDate(detailApplication?.applied_at || modalTarget?.applied_at)}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Matched skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {(detailApplication?.seeker?.skills || modalTarget?.seeker?.skills || []).map((skill, index) => (
                          <span key={`${skill}-${index}`} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{skill}</span>
                        ))}
                        {!((detailApplication?.seeker?.skills || modalTarget?.seeker?.skills || []).length) && (
                          <span className="text-sm text-slate-500">No declared skills yet.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-200 pt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Employment profile</h3>
                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Education</p><p className="mt-1 font-semibold text-slate-900">{detailApplication?.seeker?.educ_attainment || modalTarget?.seeker?.educ_attainment || 'Not specified'}</p></div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Employment status</p><p className="mt-1 font-semibold text-slate-900">{detailApplication?.seeker?.employment_status || modalTarget?.seeker?.employment_status || 'Not specified'}</p></div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><FileText className="h-4 w-4" /> Interview & outcome</h3>
                      <div className="space-y-3 text-sm text-slate-600">
                        {detailApplication?.interview || modalTarget?.interview ? (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-900">
                            <p className="font-black">Interview scheduled</p>
                            <p className="mt-1">{formatDateTime(detailApplication?.interview?.schedule || modalTarget?.interview?.schedule)}</p>
                            <p className="mt-1">{detailApplication?.interview?.venue_or_link || modalTarget?.interview?.venue_or_link || 'Venue to follow'}</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600">No interview scheduled yet.</div>
                        )}
                        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Employer remarks</p><p className="mt-1 font-semibold text-slate-900">{detailApplication?.employer_remarks || modalTarget?.employer_remarks || 'No remarks yet.'}</p></div>
                      </div>
                    </div>
                  </div>

                  {((detailApplication?.interview || modalTarget?.interview)) && (
                    <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Interview scheduled</p>
                          <p className="mt-1 text-sm font-black text-slate-950">{formatDateTime(detailApplication?.interview?.schedule || modalTarget?.interview?.schedule)}</p>
                        </div>
                        <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-indigo-700">{detailApplication?.interview?.mode_of_interview || modalTarget?.interview?.mode_of_interview}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">{detailApplication?.interview?.venue_or_link || modalTarget?.interview?.venue_or_link || 'Meeting link or venue will be shared.'}</p>
                      <p className="mt-2 text-sm text-slate-600">{detailApplication?.interview?.instructions || modalTarget?.interview?.instructions || 'Please review the applicant details before the interview.'}</p>
                    </div>
                  )}

                  <div className="mt-8 border-t border-slate-200 pt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Application timeline</h3>
                    <div className="space-y-3">
                      {(detailApplication?.timeline || modalTarget?.timeline || []).length ? (
                        (detailApplication?.timeline || modalTarget?.timeline || []).map((item, index) => (
                          <div key={`${item.title}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                            <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === (detailApplication?.status || modalTarget?.status) ? 'bg-blue-900' : 'bg-slate-300'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900">{item.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.timestamp ? formatDateTime(item.timestamp) : 'Pending'}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No timeline entries yet.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="border-t border-slate-100 p-6 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                Close Profile
              </button>
              <button onClick={() => { closeModal(); openBulkModal('interview'); }} className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all">
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL B: INTERVIEW SCHEDULER                      */}
      {/* ================================================= */}
      {activeModal === 'interview' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Schedule Interview</h2>
              <p className="text-sm text-slate-500 mt-1">Moving {Array.isArray(modalTarget) ? modalTarget.length : 1} candidate(s) to Interview stage.</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" min={todayLocalDate()} {...registerInterview('date')} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input type="time" {...registerInterview('time')} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mode of Interview</label>
                <select {...registerInterview('mode')} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="online">Online (Video Call)</option>
                  <option value="face_to_face">Face-to-Face (On-site)</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>

              {watchInterview('mode') === 'online' && (
                <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl flex items-start gap-3 mt-4">
                  <div className="mt-0.5"><Video className="h-5 w-5 text-blue-600" /></div>
                  <div className="flex-1">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" {...registerInterview('autoMeet')} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full relative"></div>
                      <span className="ml-3 text-sm font-semibold text-slate-900">Auto-generate Google Meet Link</span>
                    </label>
                    <p className="text-xs text-slate-600 mt-1">This will automatically create a meeting on your Google Calendar and send the link when you submit.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
              <button 
                onClick={() => executeStatusChange('interview')} 
                disabled={isSubmitting || !watchInterview('date') || !watchInterview('time')}
                className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center shadow-sm"
              >
                {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL C: DOLE PLACEMENT CAPTURE (SYNC)            */}
      {/* ================================================= */}
      {activeModal === 'hire' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-emerald-100 bg-emerald-50 flex items-start gap-4">
              <div className="bg-emerald-100 p-2 rounded-full shrink-0"><UserCheck className="h-6 w-6 text-emerald-700" /></div>
              <div>
                <h2 className="text-xl font-bold text-emerald-900">Official Placement Capture</h2>
                <p className="text-xs text-emerald-700 mt-1 font-medium">Mandatory DOLE SPRS reporting requirement.</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Official Start Date <span className="text-red-500">*</span></label>
                <input type="date" min={todayLocalDate()} {...registerHire('startDate')} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Placement Salary (PHP) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₱</span>
                  <input type="number" placeholder="e.g. 25000" {...registerHire('salary')} className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Employment Type <span className="text-red-500">*</span></label>
                <select {...registerHire('employmentType')} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="regular">Regular / Permanent</option>
                  <option value="contractual">Contractual / Project-based</option>
                  <option value="probationary">Probationary</option>
                  <option value="part_time">Part-Time</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
              <button 
                onClick={() => executeStatusChange('hired')} 
                disabled={isSubmitting || !getHireValues().startDate || !getHireValues().salary}
                className="px-6 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center shadow-md shadow-emerald-600/20"
              >
                {isSubmitting ? 'Syncing...' : 'Confirm Hire & Sync to PESO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
            <div className="border-b border-rose-100 bg-rose-50 p-6">
              <h2 className="text-xl font-bold text-rose-950">Record Rejection Outcome</h2>
              <p className="mt-1 text-sm text-rose-800">The selected reasons will appear in the Establishment Report / RO1-JF Form 3.</p>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Employer-Side Reason <span className="text-red-500">*</span></label>
                <select {...registerRejection('employerReason')} className="w-full rounded-lg border border-slate-300 p-2.5 text-sm">
                  {EMPLOYER_MISMATCH_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Seeker-Side Reason</label>
                <select {...registerRejection('seekerReason')} className="w-full rounded-lg border border-slate-300 p-2.5 text-sm">
                  {SEEKER_MISMATCH_REASONS.map(([value, label]) => <option key={value || 'none'} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Additional Details</label>
                <textarea {...registerRejection('details')} rows={3} maxLength={5000} className="w-full resize-y rounded-lg border border-slate-300 p-2.5 text-sm" placeholder="Optional report context" />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6">
              <button onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
              <button
                onClick={() => {
                  const rejectionValues = getRejectionValues();
                  executeStatusChange('rejected', {
                    employer_mismatch_reason_code: rejectionValues.employerReason,
                    seeker_mismatch_reason_code: rejectionValues.seekerReason || null,
                    mismatch_reason_details: rejectionValues.details || null,
                    employer_remarks: rejectionValues.details || null,
                  });
                }}
                disabled={isSubmitting || !getRejectionValues().employerReason}
                className="rounded-lg bg-rose-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Reject and Record Reason'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
