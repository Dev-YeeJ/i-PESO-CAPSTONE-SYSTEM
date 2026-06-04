const fs = require('fs');
const path = require('path');

const dirs = [
    "i-peso-frontend/src/pages/admin/seekers",
    "i-peso-frontend/src/pages/admin/employers",
    "i-peso-frontend/src/pages/admin/vacancies",
    "i-peso-frontend/src/pages/admin/programs",
    "i-peso-frontend/src/pages/admin/job-fairs",
    "i-peso-frontend/src/pages/admin/reports",
    "i-peso-frontend/src/pages/admin/activity",
    "i-peso-frontend/src/components/admin",
    "i-peso-frontend/src/services"
];

dirs.forEach(dir => {
    fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

const files = {
    "i-peso-frontend/src/pages/admin/DashboardPage.jsx": "export default function DashboardPage() { return <div>Admin Dashboard</div>; }",
    "i-peso-frontend/src/pages/admin/seekers/SeekersListPage.jsx": "export default function SeekersListPage() { return <div>Seekers List</div>; }",
    "i-peso-frontend/src/pages/admin/seekers/SeekerDetailPage.jsx": "export default function SeekerDetailPage() { return <div>Seeker Detail</div>; }",
    "i-peso-frontend/src/pages/admin/employers/EmployersListPage.jsx": "export default function EmployersListPage() { return <div>Employers List</div>; }",
    "i-peso-frontend/src/pages/admin/employers/EmployerDetailPage.jsx": "export default function EmployerDetailPage() { return <div>Employer Detail</div>; }",
    "i-peso-frontend/src/pages/admin/vacancies/VacanciesListPage.jsx": "export default function VacanciesListPage() { return <div>Vacancies List</div>; }",
    "i-peso-frontend/src/pages/admin/programs/ProgramsListPage.jsx": "export default function ProgramsListPage() { return <div>Programs List</div>; }",
    "i-peso-frontend/src/pages/admin/programs/ProgramFormPage.jsx": "export default function ProgramFormPage() { return <div>Program Form</div>; }",
    "i-peso-frontend/src/pages/admin/programs/ProgramApplicantsPage.jsx": "export default function ProgramApplicantsPage() { return <div>Program Applicants</div>; }",
    "i-peso-frontend/src/pages/admin/job-fairs/JobFairsListPage.jsx": "export default function JobFairsListPage() { return <div>Job Fairs List</div>; }",
    "i-peso-frontend/src/pages/admin/job-fairs/JobFairFormPage.jsx": "export default function JobFairFormPage() { return <div>Job Fair Form</div>; }",
    "i-peso-frontend/src/pages/admin/reports/ReportsPage.jsx": "export default function ReportsPage() { return <div>Reports Page</div>; }",
    "i-peso-frontend/src/pages/admin/reports/ReportDetailPage.jsx": "export default function ReportDetailPage() { return <div>Report Detail</div>; }",
    "i-peso-frontend/src/pages/admin/activity/ActivityLogPage.jsx": "export default function ActivityLogPage() { return <div>Activity Log</div>; }",
    "i-peso-frontend/src/services/adminService.js": "export const adminService = {};",
    "i-peso-frontend/src/services/reportService.js": "export const reportService = {};",
    "i-peso-frontend/src/components/admin/DataTable.jsx": "export default function DataTable() { return <div>Data Table</div>; }",
    "i-peso-frontend/src/components/admin/StatCard.jsx": "export default function StatCard() { return <div>Stat Card</div>; }",
    "i-peso-frontend/src/components/admin/StatusBadge.jsx": "export default function StatusBadge() { return <span>Status</span>; }",
    "i-peso-frontend/src/components/admin/ConfirmModal.jsx": "export default function ConfirmModal() { return <div>Confirm</div>; }"
};

Object.keys(files).forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, files[filePath]);
    }
});
