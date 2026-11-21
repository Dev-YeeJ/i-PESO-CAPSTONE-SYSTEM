import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Briefcase,
  Building2,
  Clock,
  Landmark,
  MapPin,
  Navigation,
  Phone,
  Search,
  UserRoundSearch,
  X,
} from 'lucide-react';
import governmentProgramService from '@/services/governmentProgramService';
import { publicLandingService } from '@/services/publicLandingService';
import PublicProgramCard from '@/components/government-programs/PublicProgramCard';
import PublicAnnouncementsSection from '@/components/announcements/PublicAnnouncementsSection';
import IPesoLogo from '@/components/branding/IPesoLogo';
import { useSiteContent } from '@/components/site-content/useSiteContent';
import { mapLinkFor, telHref } from '@/components/site-content/siteContentDefaults';
import {
  FEATURE_CARD_CLASS,
  FeatureCardContent,
  HeroBadgeIcon,
  HeroHeadlineContent,
  HeroHighlights,
  HeroSubheadlineContent,
} from '@/components/site-content/LandingBlocks';

function useSectionMotion() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return {};
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.5, ease: 'easeOut' },
  };
}

const peso = (value) => `₱${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
const SALARY_UNIT = { monthly: '/mo', month: '/mo', daily: '/day', day: '/day', hourly: '/hr', hour: '/hr', weekly: '/wk' };

function formatSalary(job) {
  const { salary_min: min, salary_max: max } = job;
  if (min == null && max == null) return 'Salary not disclosed';
  const unit = SALARY_UNIT[String(job.salary_type ?? '').toLowerCase()] ?? '';
  if (min != null && max != null && Number(max) > Number(min)) return `${peso(min)} – ${peso(max)}${unit}`;
  return `${peso(min ?? max)}${unit}`;
}

const humanize = (value) => (value ? String(value).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : null);
const placeOf = (item) => [item.barangay, item.city_municipality].filter(Boolean).join(', ');

function postedAgo(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : formatDistanceToNow(date, { addSuffix: true });
}

function fairDate(value) {
  if (!value) return { month: '—', day: '—' };
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? { month: '—', day: '—' }
    : { month: date.toLocaleDateString('en-PH', { month: 'short' }), day: String(date.getDate()).padStart(2, '0') };
}

function companyInitials(name) {
  return String(name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

const LandingPage = () => {
  const sectionMotion = useSectionMotion();
  // Text PESO staff edit in Content Modules → Landing page / Office info.
  // Falls back to the built-in wording, so the page is never blank.
  const { landing, office } = useSiteContent();
  // Sections staff switched off in Content Modules → Landing page (the hero always shows).
  const show = { announcements: true, features: true, jobs: true, programs: true, ...(landing.show_sections ?? {}) };

  const [draft, setDraft] = useState({ q: '', location: '' });
  const [search, setSearch] = useState({ q: '', location: '' });
  const searching = Boolean(search.q || search.location);

  const jobsQuery = useQuery({
    queryKey: ['public', 'featured-jobs', search],
    queryFn: () => publicLandingService.featuredJobs(search),
    enabled: show.jobs,
    staleTime: 60_000,
    retry: 1,
  });
  const fairsQuery = useQuery({ queryKey: ['public', 'job-fairs'], queryFn: publicLandingService.jobFairs, staleTime: 5 * 60_000, retry: 1 });
  const statsQuery = useQuery({ queryKey: ['public', 'stats'], queryFn: publicLandingService.stats, staleTime: 5 * 60_000, retry: 1 });
  const programsQuery = useQuery({ queryKey: ['public', 'programs'], queryFn: governmentProgramService.publicPrograms, enabled: show.programs, staleTime: 5 * 60_000, retry: 1 });

  const jobs = jobsQuery.data?.jobs ?? [];
  const totalJobs = jobsQuery.data?.total ?? 0;
  const fairs = fairsQuery.data ?? [];
  const stats = statsQuery.data;
  const programs = programsQuery.data ?? [];
  const previewJob = !searching ? jobs[0] : null;

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch({ q: draft.q.trim(), location: draft.location.trim() });
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const clearSearch = () => {
    setDraft({ q: '', location: '' });
    setSearch({ q: '', location: '' });
  };

  const statItems = stats ? [
    { label: 'Open vacancies', value: stats.open_vacancies },
    { label: 'Verified employers', value: stats.verified_employers },
    { label: 'Hired through i-PESO this year', value: stats.placed_this_year },
    { label: 'Job fairs coming up', value: stats.upcoming_job_fairs },
  ] : [];
  const showStats = statItems.some((item) => Number(item.value) > 0);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* ── Top navigation ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <IPesoLogo className="h-full w-full" />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-bold tracking-tight text-brand-navy">i-PESO</span>
              <span className="block text-xs text-slate-500">Urdaneta City</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-[15px] font-medium text-slate-600 md:flex" aria-label="Main">
            {show.jobs && <a href="#jobs" className="rounded-lg px-3.5 py-2 hover:bg-slate-100 hover:text-brand-navy">Find jobs</a>}
            {fairs.length > 0 && <a href="#fairs" className="rounded-lg px-3.5 py-2 hover:bg-slate-100 hover:text-brand-navy">Job fairs</a>}
            {show.programs && <a href="#programs" className="rounded-lg px-3.5 py-2 hover:bg-slate-100 hover:text-brand-navy">Programs</a>}
            <Link to="/about" className="rounded-lg px-3.5 py-2 hover:bg-slate-100 hover:text-brand-navy">About PESO</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-navy hover:bg-[#e8f0fc] sm:inline-flex">Sign in</Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-[#0f2d56] sm:px-5">
              Create free account
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-[#0f2d56] pb-24 pt-14 text-white sm:pt-20">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} aria-hidden="true" />
        <div className={`relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 sm:px-8 ${previewJob ? 'lg:grid-cols-[1.15fr_0.85fr] lg:gap-16' : ''}`}>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white/90">
              <HeroBadgeIcon className="h-4 w-4 text-brand-gold" />
              {landing.hero_badge}
            </span>
            <h1 className="mt-6 font-display text-[40px] leading-[1.08] tracking-tight sm:text-[56px] lg:text-[64px]">
              <HeroHeadlineContent landing={landing} />
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              <HeroSubheadlineContent landing={landing} />
            </p>

            {show.jobs && (
              <form onSubmit={submitSearch} className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-elevated sm:flex-row sm:items-stretch" role="search">
                <label className="flex flex-1 items-center gap-3 px-3 sm:px-4">
                  <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="sr-only">Job title, skill or company</span>
                  <input
                    type="text"
                    value={draft.q}
                    onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
                    placeholder="Job title, skill or company"
                    maxLength={80}
                    className="w-full bg-transparent py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </label>
                <span className="hidden w-px self-stretch bg-slate-200 sm:my-2 sm:block" aria-hidden="true" />
                <label className="flex items-center gap-3 border-t border-slate-100 px-3 sm:w-56 sm:border-0 sm:px-4">
                  <MapPin className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="sr-only">Barangay or town</span>
                  <input
                    type="text"
                    value={draft.location}
                    onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Barangay or town"
                    maxLength={80}
                    className="w-full bg-transparent py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </label>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#0f2d56]">
                  Search jobs
                </button>
              </form>
            )}

            <HeroHighlights landing={landing} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/75" />

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/register/seeker" className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><UserRoundSearch className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <span className="text-left leading-tight"><span className="block text-sm font-semibold">I&apos;m looking for work</span><span className="block text-xs text-white/60">Register with your NSRP profile</span></span>
              </Link>
              <Link to="/register/employer" className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Building2 className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <span className="text-left leading-tight"><span className="block text-sm font-semibold">I&apos;m hiring</span><span className="block text-xs text-white/60">Post vacancies after PESO verification</span></span>
              </Link>
            </div>
          </div>

          {/* Real newest vacancy as the product preview — match % needs an account, so we say so. */}
          {previewJob && (
            <div className="relative hidden lg:block">
              <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-elevated">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Newest vacancy</p>
                  {totalJobs > 1 && <span className="rounded-full bg-[#e8f0fc] px-2.5 py-1 text-xs font-semibold text-brand-navy">{totalJobs.toLocaleString()} open now</span>}
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">{companyInitials(previewJob.company_name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{previewJob.job_title}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-600">{previewJob.company_name}</p>
                      {placeOf(previewJob) && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{placeOf(previewJob)}</p>}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <p className="text-sm font-semibold tabular-nums">{formatSalary(previewJob)}</p>
                    <Link to="/register/seeker" className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f2d56]">See my match</Link>
                  </div>
                </div>
                <p className="mt-3 rounded-xl bg-brand-canvas p-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Create a free account</span> to see how well you match every vacancy before you apply.
                </p>
              </div>
              {fairs[0] && (
                <div className="absolute -bottom-6 -left-8 flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-elevated">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fffbeb] text-[#d97706]"><Clock className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                  <span className="leading-tight"><span className="block text-sm font-semibold">{fairs[0].title}</span><span className="block text-xs text-slate-500">{fairDate(fairs[0].date).month} {fairDate(fairs[0].date).day}{fairs[0].venue ? `, ${fairs[0].venue}` : ''}</span></span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Stats strip (real counts; hidden until there is something to show) ── */}
      {showStats && (
        <section className="relative z-10 -mt-12 px-4 sm:px-8">
          <dl className="mx-auto grid max-w-[1216px] grid-cols-2 gap-y-6 rounded-2xl border border-slate-200 bg-white py-6 shadow-elevated lg:grid-cols-4 lg:divide-x lg:divide-slate-200">
            {statItems.map((item) => (
              <div key={item.label} className="px-6 lg:px-8">
                <dt className="sr-only">{item.label}</dt>
                <dd className="font-display text-3xl text-brand-navy tabular-nums sm:text-4xl">{Number(item.value ?? 0).toLocaleString()}</dd>
                <p className="mt-1 text-sm font-medium text-slate-600" aria-hidden="true">{item.label}</p>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── What you get (editable feature cards) ── */}
      {show.features && (
        <Motion.section id="features" {...sectionMotion} className="mx-auto max-w-[1280px] px-4 pb-6 pt-20 sm:px-8">
          <p className="text-sm font-semibold text-[#2563b8]">{landing.features_eyebrow}</p>
          <h2 className="mt-2 max-w-2xl text-[28px] font-bold leading-9 tracking-tight sm:text-[32px] sm:leading-10">{landing.features_heading}</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {landing.features.map((feature, index) => (
              <div key={`${index}-${feature.title}`} className={FEATURE_CARD_CLASS}>
                <FeatureCardContent feature={feature} />
              </div>
            ))}
          </div>
        </Motion.section>
      )}

      {/* ── Featured vacancies + search results ── */}
      {show.jobs && (
        <section id="jobs" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 py-20 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px] sm:leading-10">
                {searching
                  ? `${totalJobs.toLocaleString()} open ${totalJobs === 1 ? 'vacancy matches' : 'vacancies match'} your search`
                  : 'Hiring now in Urdaneta'}
              </h2>
              {searching && (
                <button type="button" onClick={clearSearch} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-navy">
                  <X className="h-4 w-4" aria-hidden="true" /> Clear search
                </button>
              )}
            </div>
            {totalJobs > jobs.length && (
              <Link to="/register/seeker" className="inline-flex items-center gap-2 self-start rounded-xl border border-brand-navy bg-white px-4 py-2.5 text-sm font-semibold text-brand-navy hover:bg-[#e8f0fc] sm:self-auto">
                Sign up to see all {totalJobs.toLocaleString()}
              </Link>
            )}
          </div>

          {jobsQuery.isLoading ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((key) => (
                <div key={key} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex gap-3"><div className="h-11 w-11 rounded-lg bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 rounded bg-slate-200" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div></div>
                  <div className="mt-5 h-3 w-3/4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : jobsQuery.isError ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-brand-canvas p-8 text-center text-sm font-medium text-slate-600">Vacancies are temporarily unavailable — please check back shortly.</p>
          ) : jobs.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-brand-canvas p-8 text-center">
              <p className="font-semibold text-slate-900">{searching ? 'No open vacancies match that search.' : 'No vacancies are posted right now.'}</p>
              <p className="mt-1 text-sm text-slate-600">{searching ? 'Try a broader job title, or leave the location blank.' : 'Create an account and we will show you new matches as employers post them.'}</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <article key={job.post_id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-[#c4d9f7] hover:shadow-elevated">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">{companyInitials(job.company_name)}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{job.job_title}</h3>
                      <p className="mt-0.5 truncate text-sm text-slate-600">{job.company_name}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
                    {placeOf(job) && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />{placeOf(job)}</span>}
                    {job.employment_type && <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-slate-400" aria-hidden="true" />{humanize(job.employment_type)}</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-sm font-semibold tabular-nums">{formatSalary(job)}</p>
                    <span className="text-xs text-slate-500">{postedAgo(job.posted_at)}</span>
                  </div>
                  <Link to="/login" className="mt-3 inline-flex items-center justify-center rounded-xl border border-brand-navy px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-[#e8f0fc]">Sign in to apply</Link>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Job fairs (renders only when PESO has public fairs coming up) ── */}
      {fairs.length > 0 && (
        <Motion.section id="fairs" {...sectionMotion} className="scroll-mt-24 bg-brand-canvas py-20">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
            <h2 className="text-[28px] font-bold tracking-tight">Meet employers in person</h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {fairs.map((fair, index) => {
                const { month, day } = fairDate(fair.date);
                return (
                  <div key={fair.job_fair_id} className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                    <div className={`w-16 shrink-0 rounded-xl py-2 text-center ${index === 0 ? 'bg-brand-navy text-white' : 'bg-[#e8f0fc] text-brand-navy'}`}>
                      <p className={`text-[11px] font-semibold ${index === 0 ? 'text-white/70' : 'text-brand-navy/70'}`}>{month}</p>
                      <p className="font-display text-3xl leading-none">{day}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{fair.title}</p>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        {(fair.venue || placeOf(fair)) && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />{fair.venue || placeOf(fair)}</span>}
                        {fair.start_time && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />{fair.start_time}{fair.end_time ? ` – ${fair.end_time}` : ''}</span>}
                      </p>
                      {fair.employers_count > 0 && <span className="mt-2 inline-block rounded-full bg-brand-gold px-2.5 py-0.5 text-xs font-bold text-brand-navy">{fair.employers_count} employer{fair.employers_count === 1 ? '' : 's'}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Motion.section>
      )}

      {/* ── Announcements (Public audience; renders nothing when there are none) ── */}
      {show.announcements && <PublicAnnouncementsSection />}

      {/* ── Government programs (postings only; applied for in person) ── */}
      {show.programs && (
        <Motion.section id="programs" {...sectionMotion} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 py-20 sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px] sm:leading-10">DOLE and PESO programs open right now</h2>
            <p className="mt-3 text-[15px] leading-6 text-slate-600">Every program is free and applied for in person at the PESO office. <Link to="/register/seeker" className="font-semibold text-brand-navy underline decoration-brand-gold decoration-2 underline-offset-2">Register to check which ones you qualify for</Link> before you make the trip.</p>
          </div>

          {programsQuery.isLoading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
                  <div className="h-2.5 w-12 rounded bg-slate-200" /><div className="mt-3 h-4 w-3/4 rounded bg-slate-200" /><div className="mt-3 h-3 w-full rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : programs.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-brand-canvas p-8 text-center text-sm font-medium text-slate-600">
              {programsQuery.isError
                ? 'Programs are temporarily unavailable — please check back shortly.'
                : 'No programs are open right now — check back soon or visit the PESO office for updates.'}
            </p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => <PublicProgramCard key={program.program_id} program={program} />)}
            </div>
          )}
        </Motion.section>
      )}

      {/* ── Office info (single source: Content Modules → Office info) ── */}
      {(office.address || office.phone || office.email || office.hours) && (
        <section id="contact" className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-8">
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:grid-cols-[1fr_1.1fr]">
            <div className="p-6 sm:p-10">
              <h2 className="text-[28px] font-bold tracking-tight">We&apos;re here to help, in person too.</h2>
              <dl className="mt-8 space-y-5 text-[15px]">
                {office.address && (
                  <div className="flex gap-4"><dt className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fc] text-brand-navy"><MapPin className="h-[18px] w-[18px]" aria-label="Address" /></dt><dd><p className="font-semibold">{office.office_name}</p><p className="text-slate-600">{office.address}</p></dd></div>
                )}
                {office.hours && (
                  <div className="flex gap-4"><dt className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fc] text-brand-navy"><Clock className="h-[18px] w-[18px]" aria-label="Office hours" /></dt><dd><p className="font-semibold">Office hours</p><p className="text-slate-600">{office.hours}</p></dd></div>
                )}
                {(office.phone || office.email) && (
                  <div className="flex gap-4"><dt className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fc] text-brand-navy"><Phone className="h-[18px] w-[18px]" aria-label="Contact" /></dt><dd>
                    {office.phone && <a href={telHref(office.phone)} className="block font-semibold hover:text-brand-navy">{office.phone}</a>}
                    {office.email && <a href={`mailto:${office.email}`} className="block break-all text-slate-600 hover:text-brand-navy">{office.email}</a>}
                  </dd></div>
                )}
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                {mapLinkFor(office) && (
                  <a href={mapLinkFor(office)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2d56]"><Navigation className="h-4 w-4" aria-hidden="true" />Get directions</a>
                )}
                <Link to="/about" className="inline-flex items-center gap-2 rounded-xl border border-brand-navy px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-[#e8f0fc]">About PESO</Link>
              </div>
            </div>
            <div className="relative hidden min-h-[320px] bg-[#e8f0fc] lg:block" aria-hidden="true">
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(#c4d9f7 1px, transparent 1px), linear-gradient(90deg, #c4d9f7 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
              <div className="absolute left-[44%] top-[42%] flex flex-col items-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-white shadow-elevated"><Landmark className="h-[22px] w-[22px]" /></span>
                <span className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy shadow-card">PESO Urdaneta City</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="bg-[#071122] text-slate-400">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white"><IPesoLogo className="h-full w-full" /></span>
              <span><span className="block font-bold text-white">i-PESO</span><span className="block text-xs text-slate-500">{landing.footer_tagline}</span></span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-6">Free job matching, job fairs and government employment programs from the Public Employment Service Office.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Get started</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/register/seeker" className="hover:text-white">Find a job</Link></li>
              <li><Link to="/register/employer" className="hover:text-white">Hire talent</Link></li>
              <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {show.jobs && <li><a href="#jobs" className="hover:text-white">Featured vacancies</a></li>}
              {fairs.length > 0 && <li><a href="#fairs" className="hover:text-white">Job fairs</a></li>}
              {show.programs && <li><a href="#programs" className="hover:text-white">Government programs</a></li>}
              <li><Link to="/about" className="hover:text-white">About PESO</Link></li>
            </ul>
          </div>
          {(office.address || office.phone || office.email || office.hours || office.facebook) && (
            <div>
              <p className="text-sm font-semibold text-white">Contact</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {office.address && <li>{office.address}</li>}
                {office.hours && <li>{office.hours}</li>}
                {office.phone && <li><a href={telHref(office.phone)} className="hover:text-white">{office.phone}</a></li>}
                {office.email && <li><a href={`mailto:${office.email}`} className="break-all hover:text-white">{office.email}</a></li>}
                {office.facebook && <li><a href={office.facebook} target="_blank" rel="noreferrer" className="hover:text-white">Facebook page</a></li>}
              </ul>
            </div>
          )}
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>{landing.footer_tagline}, Pangasinan, Philippines</p>
            <div className="flex flex-wrap items-center gap-5">
              <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link>
              <Link to="/review-guidelines" className="hover:text-white">Review Guidelines</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
