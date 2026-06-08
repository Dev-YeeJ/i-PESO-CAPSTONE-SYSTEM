# Quick Reference: Employer Registration System

## 🎯 Quick Start

### Backend is Ready! ✅
```bash
# 1. Run migrations
php artisan migrate --path=database/migrations/2026_06_06*

# 2. Test an endpoint
curl -X POST http://localhost:8000/api/employer/register/step-1 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "Password123",
    "password_confirmation": "Password123",
    "company_type": "corporation_partnership"
  }'
```

---

## 📱 Frontend: What to Build

### Option A: Build Individual Components
Start with the 4 registration steps individually

### Option B: Use the Template Code
Copy the sample code from `EMPLOYER_REGISTRATION_FRONTEND.md` and customize

---

## 🔑 Key API Endpoints

| Step | Method | URL | Auth |
|------|--------|-----|------|
| 1 | POST | `/api/employer/register/step-1` | ❌ |
| 2 | POST | `/api/employer/register/step-2` | ❌ |
| 3 | POST | `/api/employer/register/step-3` | ❌ |
| 4 | POST | `/api/employer/register/step-4` | ❌ |
| Login | POST | `/api/employer/login` | ❌ |
| Profile | GET | `/api/employer/profile/{id}` | ✅ |

---

## 📋 4 Registration Steps

```
Step 1: Email, Password, Company Type (5 fields)
          ↓
Step 2: Company Info, Address, Logo (9 fields)
          ↓
Step 3: Upload Documents (Dynamic based on type)
          ↓
Step 4: Representative Info, Government ID (6 fields)
          ↓
        SUBMITTED → Status: PENDING
```

---

## 🏢 Company Types & Required Documents

```
Sole Proprietorship
  → Mayor's Permit, BIR, DTI

Corporation/Partnership
  → Mayor's Permit, BIR, SEC

Local Recruitment Agency
  → Mayor's Permit, BIR, SEC, PRPA License

Overseas Recruitment Agency
  → Mayor's Permit, BIR, SEC, DMW/POEA License
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `EMPLOYER_REGISTRATION_GUIDE.md` | Complete API reference |
| `EMPLOYER_REGISTRATION_FRONTEND.md` | React component code |
| `ADMIN_EMPLOYER_VERIFICATION_GUIDE.md` | Admin portal guide |
| `EMPLOYER_REGISTRATION_SUMMARY.md` | Full overview |

---

## 🛠️ Database Tables

### employers
- Step 1-2 data (company type, profile info)
- Step 4 data (representative details)
- Verification tracking (status, verified_at, etc.)

### employer_documents
- One row per uploaded document
- Tracks file path, verification status
- Admin notes for rejections

---

## 🔒 Verification Flow

```
After Step 4 → Status: PENDING
Admin reviews → Approve/Reject
If Approve → Status: VERIFIED (Can post jobs)
If Reject → Status: REJECTED (Can resubmit)
```

---

## 💡 Tips for Frontend Developers

1. **Step 1-3 are sequential** → Each needs previous step completed
2. **Step 3 documents are dynamic** → Show different docs based on company_type from Step 1
3. **File uploads use FormData** → Not JSON
4. **PSGC Cascade** → Fetch city options after province selected
5. **Store employer_id** → Needed for all subsequent steps

---

## 🔗 Component Dependencies

```
EmployerRegistration (main)
├── Step1AccountSetup
├── Step2CompanyProfile
│   └── PsgcCascade (helper)
├── Step3DocumentUpload
│   ├── DocumentUploadZone (helper)
│   └── RequiredDocumentsCheckbox (helper)
└── Step4Representative
```

---

## 📥 Form Data Structure

### Step 1 Input
```json
{
  "email": "employer@company.com",
  "password": "SecurePass123",
  "password_confirmation": "SecurePass123",
  "company_type": "corporation_partnership"
}
```

### Step 1 Response
```json
{
  "message": "Step 1 completed...",
  "employer_id": 5,
  "company_type": "corporation_partnership"
}
```

→ **Save employer_id** for next steps!

---

## ✅ Deployment Checklist

- [ ] Run migrations
- [ ] Create storage link: `php artisan storage:link`
- [ ] Build React components
- [ ] Test all 4 steps
- [ ] Test file uploads
- [ ] Build admin dashboard
- [ ] Test approve/reject
- [ ] Test emails (TODO)

---

## 🚨 Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| File upload fails | Check storage permissions: `chmod -R 775 storage/` |
| Required documents not loading | Verify employer_id is passed correctly |
| Migrations don't run | Check Laravel version (11+) |
| PSGC cascade empty | Need to seed PSGC data or fetch from external API |
| Status not updating | Check employer is retrieved with fresh data |

---

## 📞 Quick Help

**Backend Issue?**
- Check `storage/logs/laravel.log`
- Run `php artisan tinker` to debug
- Test endpoint with Postman

**Frontend Issue?**
- Check browser console (F12)
- Verify API URL is correct
- Log the response to see what's returned

**Need Help?**
- Read the full guide file (EMPLOYER_REGISTRATION_GUIDE.md)
- Check the component code samples
- Ask senior dev

---

## 🚀 You're Ready!

Backend: ✅ Complete
Frontend: 📋 Guided
Admin: 📋 Guided

Start building! 🎉

