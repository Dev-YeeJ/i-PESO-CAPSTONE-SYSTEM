# Employer Registration System - Complete Implementation Guide

## Overview

This is a **4-step employer registration flow** with conditional document requirements based on company type and PESO admin verification before job posting is allowed.

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│  EMPLOYER REGISTRATION FLOW (4 Steps)           │
├─────────────────────────────────────────────────┤
│                                                 │
│ Step 1: Account Setup & Company Type ──→ PENDING
│         (Email, Password, Company Type)         │
│         ↓                                        │
│ Step 2: Company Profile                         │
│         (Company Info, Address, Description)    │
│         ↓                                        │
│ Step 3: Legal Documents Upload                  │
│         (PDFs, Permits - CONDITIONAL)           │
│         ↓                                        │
│ Step 4: Representative Details                  │
│         (Name, Contact, Government ID)          │
│         ↓                                        │
│      SUBMIT FOR REVIEW                          │
│         ↓                                        │
│  ┌─────────────────────────────────────┐       │
│  │ ADMIN VERIFICATION PORTAL           │       │
│  ├─────────────────────────────────────┤       │
│  │ Review Documents → Approve/Reject   │       │
│  └─────────────────────────────────────┘       │
│         ↓                                        │
│    VERIFIED → Can Post Jobs ✅                  │
│    or                                           │
│    REJECTED → Request Resubmission ❌           │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Database Schema

### employers Table (Updated)

```sql
CREATE TABLE employers (
  employer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- Step 1: Account Setup
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  company_type ENUM('sole_proprietorship', 'corporation_partnership', 
                    'local_recruitment_agency', 'overseas_recruitment_agency'),
  
  -- Step 2: Company Profile
  company_name VARCHAR(255),
  trade_name VARCHAR(255) NULLABLE,
  industry VARCHAR(255),
  company_size ENUM('micro', 'small', 'medium', 'large'),
  province VARCHAR(255),
  city_municipality VARCHAR(255),
  barangay VARCHAR(255),
  house_unit_street VARCHAR(255),
  complete_address VARCHAR(500),
  company_description LONGTEXT,
  company_logo VARCHAR(500),
  
  -- Step 4: Representative
  representative_name VARCHAR(255),
  representative_first_name VARCHAR(255),
  representative_middle_name VARCHAR(255),
  representative_last_name VARCHAR(255),
  representative_designation VARCHAR(255),
  mobile_number VARCHAR(20),
  representative_contact_number VARCHAR(20),
  profile_image VARCHAR(500),
  
  -- Verification & Admin
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  verified_at TIMESTAMP NULLABLE,
  rejection_reason TEXT NULLABLE,
  verified_by_admin_id BIGINT NULLABLE,
  
  -- Timestamps
  email_verified_at TIMESTAMP NULLABLE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP NULLABLE (Soft Delete)
);
```

### employer_documents Table

```sql
CREATE TABLE employer_documents (
  document_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employer_id BIGINT NOT NULL,
  
  document_type ENUM(
    'mayors_permit',
    'bir_certificate',
    'philJobnet_proof',
    'dti_certificate',
    'sec_certificate',
    'prpa_license',
    'dme_poea_license',
    'no_pending_case_certificate',
    'company_logo',
    'government_id',
    'authorization_letter',
    'other'
  ),
  
  document_path VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP,
  
  verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT NULLABLE,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (employer_id) REFERENCES employers(employer_id) ON DELETE CASCADE,
  INDEX(employer_id, document_type),
  INDEX(verification_status)
);
```

---

## API Endpoints

### Registration Flow (Public - No Auth)

#### Step 1: Account Setup & Company Type
```
POST /api/employer/register/step-1

Request:
{
  "email": "employer@company.com",
  "password": "SecurePass123",
  "password_confirmation": "SecurePass123",
  "company_type": "corporation_partnership"
}

Response (201):
{
  "message": "Step 1 completed: Account created and company type set.",
  "employer_id": 5,
  "company_type": "corporation_partnership"
}
```

#### Step 2: Company Profile
```
POST /api/employer/register/step-2

Request (form-data):
{
  "employer_id": 5,
  "company_name": "TechCorp Solutions Inc.",
  "trade_name": "TechCorp",
  "industry": "Information Technology",
  "company_size": "medium",
  "province": "Pangasinan",
  "city_municipality": "Urdaneta City",
  "barangay": "Rosario District",
  "house_unit_street": "123 Tech Street, Business Complex",
  "company_description": "Leading IT solutions provider...",
  "company_logo": <FILE>
}

Response (200):
{
  "message": "Step 2 completed: Company profile saved.",
  "employer_id": 5,
  "company_name": "TechCorp Solutions Inc."
}
```

#### Step 3: Upload Documents
```
POST /api/employer/register/step-3

Request (form-data):
{
  "employer_id": 5,
  "document_type": "sec_certificate",
  "document_file": <FILE>
}

Response (201):
{
  "message": "Document uploaded successfully.",
  "document_id": 12,
  "document_type": "sec_certificate"
}

// Call multiple times for each document
```

#### Get Required Documents
```
GET /api/employer/required-documents/{employer_id}

Response (200):
{
  "required_documents": ["mayors_permit", "bir_certificate", "sec_certificate"],
  "uploaded_documents": ["bir_certificate"],
  "missing_documents": ["mayors_permit", "sec_certificate"],
  "all_uploaded": false
}
```

#### Step 4: Representative Details (Submit Registration)
```
POST /api/employer/register/step-4

Request (form-data):
{
  "employer_id": 5,
  "representative_first_name": "Juan",
  "representative_middle_name": "Miguel",
  "representative_last_name": "Santos",
  "representative_designation": "Human Resources Manager",
  "representative_contact_number": "09123456789",
  "government_id": <FILE>,
  "authorization_letter": <FILE (Optional)>
}

Response (200):
{
  "message": "Registration submitted for review. Your account is now pending verification.",
  "employer_id": 5,
  "verification_status": "pending"
}
```

### Employer Login
```
POST /api/employer/login

Request:
{
  "email": "employer@company.com",
  "password": "SecurePass123"
}

Response (200):
{
  "message": "Login successful",
  "employer_id": 5,
  "email": "employer@company.com",
  "verification_status": "pending",
  "can_post_jobs": false,
  "token": "AUTH_TOKEN_HERE"
}
```

### Get Employer Profile (Authenticated)
```
GET /api/employer/profile/{employer_id}

Response (200):
{
  "employer": {
    "employer_id": 5,
    "email": "employer@company.com",
    "company_type": "corporation_partnership",
    "company_name": "TechCorp Solutions Inc.",
    "verification_status": "pending",
    "can_post_jobs": false,
    ...all other fields
  },
  "documents": [...],
  "required_documents": ["mayors_permit", "bir_certificate", "sec_certificate"],
  "all_required_uploaded": false,
  "can_post_jobs": false
}
```

---

## Admin Verification API

### Get Pending Employers
```
GET /api/admin/employers/pending

Response (200):
{
  "total": 3,
  "employers": [
    {
      "employer_id": 5,
      "email": "employer@company.com",
      "company_name": "TechCorp Solutions Inc.",
      "company_type": "corporation_partnership",
      "created_at": "2026-06-06T10:00:00Z",
      "documents_count": 2,
      "required_documents": ["mayors_permit", "bir_certificate", "sec_certificate"],
      "all_required_uploaded": false
    }
  ]
}
```

### Review Employer Details
```
GET /api/admin/employers/{employer_id}/review

Response (200):
{
  "employer": {...all details...},
  "documents": [
    {
      "document_id": 12,
      "document_type": "sec_certificate",
      "document_path": "storage/employer_documents/...",
      "verification_status": "pending",
      "uploaded_at": "2026-06-06T10:30:00Z"
    }
  ],
  "required_documents": [...],
  "uploaded_documents": [...]
}
```

### Approve Employer
```
POST /api/admin/employers/{employer_id}/approve

Response (200):
{
  "message": "Employer approved successfully.",
  "employer_id": 5,
  "verification_status": "verified",
  "verified_at": "2026-06-06T11:00:00Z"
}
```

### Reject Employer
```
POST /api/admin/employers/{employer_id}/reject

Request:
{
  "rejection_reason": "SEC Certificate is expired. Please provide a valid updated certificate."
}

Response (200):
{
  "message": "Employer registration rejected.",
  "employer_id": 5,
  "verification_status": "rejected",
  "rejection_reason": "SEC Certificate is expired..."
}
```

---

## Company Type → Required Documents Matrix

| Company Type | Required Documents |
|------|----------------------|
| **Sole Proprietorship** | ✅ Mayor's Permit<br>✅ BIR Certificate (Form 2303)<br>✅ DTI Certificate |
| **Corporation / Partnership** | ✅ Mayor's Permit<br>✅ BIR Certificate (Form 2303)<br>✅ SEC Certificate |
| **Local Recruitment Agency (PRPA)** | ✅ Mayor's Permit<br>✅ BIR Certificate (Form 2303)<br>✅ SEC Certificate<br>✅ DOLE PRPA License |
| **Overseas Recruitment Agency** | ✅ Mayor's Permit<br>✅ BIR Certificate (Form 2303)<br>✅ SEC Certificate<br>✅ DMW/POEA License |

**Optional for all**:
- PhilJobNet Proof
- Certificate of No Pending Case from DOLE

---

## Frontend Component Structure

### React Web App (i-peso-frontend)

```
src/pages/employer/
├── EmployerRegistration.jsx          (Main 4-step form)
├── steps/
│   ├── Step1AccountSetup.jsx          (Email, Password, Company Type)
│   ├── Step2CompanyProfile.jsx        (Company Info, Address)
│   ├── Step3DocumentUpload.jsx        (Dynamic docs based on company type)
│   └── Step4Representative.jsx        (Representative Details)
├── components/
│   ├── CompanyTypeSelector.jsx        (Radio buttons with descriptions)
│   ├── PsgcCascade.jsx               (Province → City → Barangay)
│   ├── DocumentUploadZone.jsx         (Drag-drop file upload)
│   ├── RequiredDocumentsCheckbox.jsx  (Shows required vs uploaded)
│   └── PendingVerificationBanner.jsx  (Shows status)
└── EmployerDashboard.jsx              (Post-registration dashboard)

src/services/
├── employerService.js                 (API calls for registration)
└── employerAuthService.js             (Login, logout)
```

### React Native Mobile App (i-peso-mobile)

```
app/(employer)/
├── registration/
│   ├── _layout.tsx                    (Navigation)
│   ├── step1.tsx                      (Account Setup)
│   ├── step2.tsx                      (Company Profile)
│   ├── step3.tsx                      (Document Upload)
│   └── step4.tsx                      (Representative)
├── components/
│   ├── CompanyTypeSelector.tsx
│   ├── DocumentUploadModal.tsx
│   └── PendingVerificationBanner.tsx
└── services/
    └── employerService.ts             (Same as web)
```

---

## Conditional Document Upload Logic

### Frontend Implementation

```javascript
// Step 3 - Show/Hide Documents Based on Company Type
const getRequiredDocuments = (companyType) => {
  const baseDocuments = [
    { type: 'mayors_permit', label: "Mayor's Permit", required: true },
    { type: 'bir_certificate', label: 'BIR Certificate (Form 2303)', required: true },
    { type: 'philJobnet_proof', label: 'PhilJobNet Proof', required: false },
  ];

  const additionalByType = {
    'sole_proprietorship': [
      { type: 'dti_certificate', label: 'DTI Certificate', required: true },
    ],
    'corporation_partnership': [
      { type: 'sec_certificate', label: 'SEC Certificate', required: true },
    ],
    'local_recruitment_agency': [
      { type: 'sec_certificate', label: 'SEC Certificate', required: true },
      { type: 'prpa_license', label: 'DOLE PRPA License', required: true },
    ],
    'overseas_recruitment_agency': [
      { type: 'sec_certificate', label: 'SEC Certificate', required: true },
      { type: 'dme_poea_license', label: 'DMW/POEA License', required: true },
    ],
  };

  return [...baseDocuments, ...(additionalByType[companyType] || [])];
};
```

---

## Verification Status & Job Posting

### Employer Dashboard Logic

```javascript
if (employer.verification_status === 'pending') {
  // Show banner: "Your account is under review by Urdaneta City PESO"
  // Disable "Post a Job" button
  // Show document checklist
} else if (employer.verification_status === 'verified') {
  // Show success banner
  // Enable "Post a Job" button
  // Employer can use all features
} else if (employer.verification_status === 'rejected') {
  // Show error banner with rejection reason
  // Show "Edit & Resubmit" button
  // Allow editing profile and resubmitting
}
```

---

## File Upload Security

### Backend Validation
- ✅ Max file size: 10MB
- ✅ Allowed types: PDF, JPG, PNG, DOC, DOCX
- ✅ Store in private storage (not public web root)
- ✅ Validate MIME type server-side
- ✅ Generate unique filename to prevent overwrites

### Frontend Validation
- ✅ Drag-drop zone with preview
- ✅ File type validation
- ✅ File size warning
- ✅ Progress bar during upload

---

## Email Notifications

### Automated Emails (TODO)

1. **Registration Submitted**
   - To: Employer email
   - Subject: Your employer account registration has been submitted
   - Body: "Your registration is under review..."

2. **Account Approved**
   - To: Employer email
   - Subject: Your employer account has been verified!
   - Body: "Congratulations! You can now post job listings..."

3. **Account Rejected**
   - To: Employer email
   - Subject: Your employer account registration needs attention
   - Body: Rejection reason + "Please edit your profile and resubmit..."

---

## Deployment Steps

### 1. Run Migrations
```bash
php artisan migrate --path=database/migrations/2026_06_06_000000_update_employers_table_for_registration.php
php artisan migrate --path=database/migrations/2026_06_06_000001_create_employer_documents_table.php
```

### 2. Create Storage Symlink (if not exists)
```bash
php artisan storage:link
```

### 3. Configure File Permissions
```bash
chmod -R 775 storage/app/public/employer_documents
chmod -R 775 storage/app/public/employer_logos
```

### 4. Seed Test Data (Optional)
```bash
php artisan tinker
# Create test employer records
```

---

## Testing Checklist

### Backend API
- [ ] Step 1: Create employer account with company type
- [ ] Step 2: Update company profile with PSGC data
- [ ] Step 3: Upload documents (test conditional logic)
- [ ] Step 4: Submit representative details
- [ ] Admin: Get pending employers list
- [ ] Admin: Review employer details with documents
- [ ] Admin: Approve employer → Status changes to verified
- [ ] Admin: Reject employer → Shows rejection reason
- [ ] Employer: Can't post jobs while pending
- [ ] Employer: Can post jobs after verified

### Frontend
- [ ] Company type selector works
- [ ] PSGC cascade loads correctly
- [ ] File upload drag-drop works
- [ ] Document checklist updates
- [ ] Pending verification banner shows
- [ ] Form pre-fill after step completion
- [ ] Error messages display properly
- [ ] Mobile responsive layout

---

## Support & Next Steps

1. Build frontend components using this API contract
2. Implement email notifications
3. Add admin dashboard for document review
4. Add employer dashboard with job posting features
5. Test end-to-end verification flow

---

**Employer Registration System - Ready for Implementation! 🚀**

