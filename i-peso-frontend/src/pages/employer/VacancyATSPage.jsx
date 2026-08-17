import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckSquare, Square, MapPin, GraduationCap, Calendar as CalendarIcon,
  Mail, Phone, CheckCircle2, XCircle, Clock, Video, UserCheck,
  Briefcase, Sparkles, FileText, UserRound, Users, ArrowUpDown,
  MoreHorizontal, Eye, ArrowLeft, Building2, RefreshCw, Filter,
  ChevronUp, Star, Inbox, ListChecks, CalendarCheck, Award, Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getVacancyApplications,
  getEmployerApplicationDetail,
  updateEmployerApplicationStatusBulk,
  connectGoogleCalendar,
} from '@/services/employerApplicationService';
import { getVacancy } from '@/services/employerService';
import { Badge } from '@/components/ui';

// ─── CONSTANTS ───────────────────────────────────────────────
const todayLocalDate = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const PIPELINE_TABS = [
  { id: 'pending',     label: 'Inbox',        icon: Inbox },
  { id: 'reviewed',    label: 'Reviewed',      icon: Eye },
  { id: 'shortlisted', label: 'Shortlisted',  icon: Star },
  { id: 'interview',   label: 'Interview',    icon: CalendarCheck },
  { id: 'hired',       label: 'Hired',        icon: Award },
  { id: 'rejected',    label: 'Rejected',     icon: Ban },
];

const SORT_OPTIONS = [
  { value: 'match_score', label: 'Match Score', dir: 'desc' },
  { value: 'applied_date', label: 'Date Applied', dir: 'desc' },
  { value: 'name', label: 'Name (A-Z)', dir: 'asc' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

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

// ─── HELPERS ─────────────────────────────────────────────────
const statusTone = (status) => {
  const map = {
    pending:     'bg-slate-50 border-slate-200 text-slate-600',
    reviewed:    'bg-blue-50 border-blue-200 text-blue-700',
    shortlisted: 'bg-purple-50 border-purple-200 text-purple-700',
    interview:   'bg-amber-50 border-amber-200 text-amber-700',
    hired:       'bg-emerald-50 border-emerald-200 text-emerald-700',
    rejected:    'bg-red-50 border-red-200 text-red-700',
    withdrawn:   'bg-slate-100 border-slate-300 text-slate-500',
  };
  return map[status] || map.pending;
};

const getMatchColor = (score) => {
  if (score >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (score >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (score >= 50) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-slate-100 text-slate-600 border-slate-300';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function VacancyATSPage() {
  const { vacancyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── State ──
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('match_score');
  const [sortDir, setSortDir] = useState('desc');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeModal, setActiveModal] = useState(null);
  const [modalTarget, setModalTarget] = useState(null);
  const [detailApplication, setDetailApplication] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // ── Debounced Search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Forms ──
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

  // ── Data Queries ──
  const vacancyQuery = useQuery({
    queryKey: ['vacancy', vacancyId],
    queryFn: () => getVacancy(vacancyId),
    staleTime: 1000 * 60 * 5,
    enabled: !!vacancyId,
  });

  const vacancy = vacancyQuery.data;

  const applicationsQuery = useQuery({
    queryKey: ['vacancyApplications', vacancyId, activeTab, debouncedSearch, sortBy, sortDir, pageSize, currentPage],
    queryFn: () => getVacancyApplications(vacancyId, {
      status: activeTab,
      search: debouncedSearch || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      per_page: pageSize,
      page: currentPage,
    }),
    staleTime: 1000 * 30,
    refetchInterval: 30000,
    enabled: !!vacancyId,
    onSuccess: () => setLastUpdated(new Date()),
  });

  const applications = applicationsQuery.data?.data || [];
  const pagination = applicationsQuery.data || {};
  const totalItems = pagination.total || 0;
  const totalPages = pagination.last_page || 1;
  const fromItem = pagination.from || 0;
  const toItem = pagination.to || 0;

  // Fetch all-status counts for pipeline tabs
  const countsQuery = useQuery({
    queryKey: ['vacancyATSCounts', vacancyId],
    queryFn: async () => {
      const results = await Promise.all(
        PIPELINE_TABS.map(tab =>
          getVacancyApplications(vacancyId, { status: tab.id, per_page: 1 })
        )
      );
      const counts = {};
      PIPELINE_TABS.forEach((tab, i) => {
        counts[tab.id] = results[i]?.total || 0;
      });
      return counts;
    },
    staleTime: 1000 * 30,
    refetchInterval: 30000,
    enabled: !!vacancyId,
  });

  const tabCounts = countsQuery.data || {};
  const totalApplicants = Object.values(tabCounts).reduce((a, b) => a + b, 0);

  // ── Selection ──
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === applications.length && applications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map(app => app.apply_id)));
    }
  }, [selectedIds.size, applications]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Status Change Engine ──
  const executeStatusChange = async (targetStatus, payload = {}) => {
    setIsSubmitting(true);
    const targets = Array.isArray(modalTarget) ? modalTarget : [modalTarget];

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
      toast.success(`Successfully moved ${targets.length} candidate${targets.length > 1 ? 's' : ''} to ${targetStatus}`);
      closeModal();
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['vacancyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['vacancyATSCounts'] });
    } catch (err) {
      if (err.response?.status === 403 && (err.response?.data?.message?.includes('Google Calendar not connected') || err.response?.data?.message?.includes('token expired'))) {
        toast('Redirecting to connect Google Calendar...', { icon: '🗓️' });
        try {
          const { url } = await connectGoogleCalendar();
          window.location.href = url;
        } catch { toast.error('Failed to initiate Google Calendar connection.'); }
      } else {
        toast.error(err.response?.data?.message || 'Action failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Modal Handlers ──
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

  const openSingleAction = (app, status) => {
    setModalTarget([app]);
    if (status === 'interview') setActiveModal('interview');
    else if (status === 'hired') setActiveModal('hire');
    else if (status === 'rejected') setActiveModal('reject');
    else {
      setModalTarget([app]);
      executeStatusChange(status);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalTarget(null);
    setDetailApplication(null);
    resetInterview();
    resetHire();
    resetRejection();
  };

  // ── Pagination ──
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    setSelectedIds(new Set());
  };

  // ── Loading / Error States ──
  if (vacancyQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-slate-500">Loading vacancy details...</p>
        </div>
      </div>
    );
  }

  if (vacancyQuery.isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <XCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">Vacancy Not Found</h2>
            <p className="mt-2 text-sm text-slate-600">This vacancy doesn't exist or you don't have permission to view it.</p>
            <button onClick={() => navigate('/employer/vacancies')} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Vacancies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ════════════════════════════════════════════════════════ */}
      {/* VACANCY CONTEXT HEADER                                  */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <button onClick={() => navigate('/employer/vacancies')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Vacancies
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Updated {timeAgo(lastUpdated)}
            </span>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['vacancyApplications'] });
                queryClient.invalidateQueries({ queryKey: ['vacancyATSCounts'] });
                setLastUpdated(new Date());
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${applicationsQuery.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Job details */}
        <div className="px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{vacancy?.job_title}</h1>
                <Badge variant={vacancy?.status} className="uppercase text-[10px] tracking-wider">{vacancy?.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                {vacancy?.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{vacancy.location}</span>
                )}
                {vacancy?.employment_type && (
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{vacancy.employment_type}</span>
                )}
                {vacancy?.vacancies_count !== undefined && (
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{vacancy.vacancies_count} opening{vacancy.vacancies_count !== 1 ? 's' : ''}</span>
                )}
                {vacancy?.application_deadline && (
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium"><CalendarIcon className="h-3.5 w-3.5" />Deadline: {formatDate(vacancy.application_deadline)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalApplicants}</p>
            </div>
            {PIPELINE_TABS.map(tab => {
              const count = tabCounts[tab.id] || 0;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSelectedIds(new Set()); }}
                  className={`rounded-xl px-4 py-3 border text-left transition-all hover:shadow-sm ${
                    activeTab === tab.id
                      ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <TabIcon className="h-3 w-3" />{tab.label}
                  </p>
                  <p className={`text-2xl font-extrabold mt-1 ${activeTab === tab.id ? 'text-blue-700' : 'text-slate-900'}`}>{count}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* PIPELINE TABS (Horizontal)                              */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
          {PIPELINE_TABS.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSelectedIds(new Set()); }}
                className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-semibold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
                <span className={`ml-1 py-0.5 px-2 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tabCounts[tab.id] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* TOOLBAR                                                 */}
        {/* ════════════════════════════════════════════════════════ */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, skills, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => {
                  const opt = SORT_OPTIONS.find(o => o.value === e.target.value);
                  setSortBy(opt.value);
                  setSortDir(opt.dir);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Page size */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Connect Calendar */}
            <button
              onClick={async () => {
                try {
                  const { url } = await connectGoogleCalendar();
                  window.location.href = url;
                } catch { toast.error('Failed to initiate Google Calendar connection.'); }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* DATA TABLE                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                <th className="py-3 px-4 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600 transition-colors">
                    {selectedIds.size === applications.length && applications.length > 0
                      ? <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
                      : <Square className="h-4.5 w-4.5" />
                    }
                  </button>
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Match</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Skills</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Education</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Applied</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applicationsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-4 bg-slate-200 rounded" /></td>
                    <td className="py-4 px-4"><div className="flex gap-3"><div className="h-10 w-10 bg-slate-200 rounded-full" /><div className="space-y-2"><div className="h-4 w-32 bg-slate-200 rounded" /><div className="h-3 w-24 bg-slate-100 rounded" /></div></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-200 rounded-md" /></td>
                    <td className="py-4 px-4"><div className="flex gap-1"><div className="h-5 w-16 bg-slate-200 rounded" /><div className="h-5 w-14 bg-slate-200 rounded" /></div></td>
                    <td className="py-4 px-4 hidden lg:table-cell"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                    <td className="py-4 px-4 hidden md:table-cell"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-6 bg-slate-200 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-100 rounded-2xl p-4 mb-4">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">No candidates in this stage</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {debouncedSearch ? 'Try adjusting your search query.' : 'Candidates will appear here when they apply.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const isSelected = selectedIds.has(app.apply_id);
                  const seeker = app.seeker || {};
                  const skills = seeker.skills || [];
                  const topSkills = skills.slice(0, 3);

                  return (
                    <tr
                      key={app.apply_id}
                      className={`transition-colors group ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button onClick={() => toggleSelect(app.apply_id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-blue-600" /> : <Square className="h-4.5 w-4.5" />}
                        </button>
                      </td>

                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                            {getInitials(seeker.name)}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => openProfileModal(app)}
                              className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors text-left truncate block max-w-[200px]"
                            >
                              {seeker.name}
                            </button>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{seeker.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Match */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getMatchColor(app.match_percentage)}`}>
                          {parseFloat(app.match_percentage).toFixed(0)}%
                        </span>
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {topSkills.map((s, i) => (
                            <span key={i} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                              {s}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-xs font-medium">
                              +{skills.length - 3}
                            </span>
                          )}
                          {skills.length === 0 && <span className="text-xs text-slate-400 italic">No skills</span>}
                        </div>
                      </td>

                      {/* Education */}
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{seeker.educ_attainment || 'Not specified'}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{seeker.address || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Applied */}
                      <td className="py-3.5 px-4">
                        <div className="text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {timeAgo(app.applied_at)}
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(app.applied_at)}</p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openProfileModal(app)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {activeTab === 'interview' && (
                            <Link
                              to="/employer/calendar"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="View in Calendar"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* PAGINATION                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        {totalPages > 0 && applications.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{fromItem}</span> – <span className="font-semibold text-slate-700">{toItem}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> applicants
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="First page">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page numbers */}
              {(() => {
                const pages = [];
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, currentPage + 2);
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button key={i} onClick={() => goToPage(i)} className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold transition-colors ${
                      i === currentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}>
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}

              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Last page">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* STICKY BULK ACTION BAR                                  */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-5 fade-in border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold">
              {selectedIds.size}
            </div>
            <span className="font-semibold text-sm whitespace-nowrap">Selected</span>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Move to:</span>
            {activeTab !== 'reviewed' && (
              <button onClick={() => openBulkModal('reviewed')} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300">
                Reviewed
              </button>
            )}
            {activeTab !== 'shortlisted' && (
              <button onClick={() => openBulkModal('shortlisted')} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300">
                Shortlist
              </button>
            )}
            <button onClick={() => openBulkModal('interview')} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 transition-colors text-white">
              Interview
            </button>
            <button onClick={() => openBulkModal('hired')} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 transition-colors text-white ml-1">
              Hire
            </button>
            <button onClick={() => openBulkModal('rejected')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 transition-colors ml-1">
              Reject
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL A: PROFILE REVEAL (R.A. 10911 COMPLIANCE)        */}
      {/* ════════════════════════════════════════════════════════ */}
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
                  <p className="text-blue-600 font-medium mt-1">Applying for: {vacancy?.job_title}</p>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
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
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Matched Skills</h3>
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
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Employment Profile</h3>
                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Education</p><p className="mt-1 font-semibold text-slate-900">{detailApplication?.seeker?.educ_attainment || modalTarget?.seeker?.educ_attainment || 'Not specified'}</p></div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Employment Status</p><p className="mt-1 font-semibold text-slate-900">{detailApplication?.seeker?.employment_status || modalTarget?.seeker?.employment_status || 'Not specified'}</p></div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><FileText className="h-4 w-4" /> Interview & Outcome</h3>
                      <div className="space-y-3 text-sm text-slate-600">
                        {detailApplication?.interview || modalTarget?.interview ? (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-900">
                            <p className="font-black">Interview Scheduled</p>
                            <p className="mt-1">{formatDateTime(detailApplication?.interview?.schedule || modalTarget?.interview?.schedule)}</p>
                            <p className="mt-1">{detailApplication?.interview?.venue_or_link || modalTarget?.interview?.venue_or_link || 'Venue to follow'}</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600">No interview scheduled yet.</div>
                        )}
                        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Employer Remarks</p><p className="mt-1 font-semibold text-slate-900">{detailApplication?.employer_remarks || modalTarget?.employer_remarks || 'No remarks yet.'}</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-8 border-t border-slate-200 pt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Application Timeline</h3>
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
              {!['hired', 'rejected', 'withdrawn'].includes(detailApplication?.status || modalTarget?.status) && (
                <button
                  onClick={() => {
                    const app = detailApplication || modalTarget;
                    closeModal();
                    setSelectedIds(new Set([app.apply_id]));
                    setTimeout(() => openBulkModal('interview'), 100);
                  }}
                  className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all"
                >
                  Schedule Interview
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL B: INTERVIEW SCHEDULER                            */}
      {/* ════════════════════════════════════════════════════════ */}
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
                <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl flex items-start gap-3">
                  <div className="mt-0.5"><Video className="h-5 w-5 text-blue-600" /></div>
                  <div className="flex-1">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" {...registerInterview('autoMeet')} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full relative"></div>
                      <span className="ml-3 text-sm font-semibold text-slate-900">Auto-generate Google Meet Link</span>
                    </label>
                    <p className="text-xs text-slate-600 mt-1">This will automatically create a meeting on your Google Calendar and send the link.</p>
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

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL C: DOLE PLACEMENT CAPTURE                         */}
      {/* ════════════════════════════════════════════════════════ */}
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

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL D: REJECTION RECORDER                             */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeModal === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
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
