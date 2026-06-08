# Complete Testing Guide - Employer Registration Flow

## 🎯 Test the Full Registration Flow (Step 1 to Step 4)

---

## ✅ Prerequisites (Do These First)

### 1. Run Backend Migrations
```bash
cd i-peso-backend
php artisan migrate --path=database/migrations/2026_06_06*
```

**Expected Output:**
```
Migration table created successfully.
Migrated: 2026_06_06_000000_update_employers_table_for_registration
Migrated: 2026_06_06_000001_create_employer_documents_table
```

### 2. Create Storage Link
```bash
php artisan storage:link
```

**Expected Output:**
```
The [public/storage] link has been created.
```

### 3. Start Backend Server
```bash
php artisan serve
```

**Expected Output:**
```
Server running on [http://127.0.0.1:8000]
```

✓ Keep this terminal running while testing!

### 4. Start Frontend Dev Server (New Terminal)
```bash
cd i-peso-frontend
npm run dev
```

**Expected Output:**
```
➜  Local:   http://localhost:5173/
➜  press h to show help
```

✓ Keep this terminal running while testing!

---

## 🧪 Testing the Registration Flow

### Step 1: Navigate to Registration Page

1. Open browser: `http://localhost:5173/employer/register`
2. You should see:
   - Title: "Employer Registration"
   - Progress bar (0% complete)
   - Step 1: Account Setup form

✓ **Pass**: Page loads without errors

---

### Step 2: Fill Out Step 1 - Account Setup

**Form fields:**
- Email Address: `test@company.com`
- Password: `Password123!`
- Confirm Password: `Password123!`
- Company Type: Select "Corporation / Partnership"

**To submit:**
1. Click "Continue to Step 2" button
2. Wait for response (should see loading indicator)

**Expected Results:**
- ✓ Form validates (required fields checked)
- ✓ Success: Page moves to Step 2
- ✓ Progress bar shows 25%
- ✓ Step 2 form appears

**Common Issues:**

| Problem | Solution |
|---------|----------|
| "Failed to register" | Backend not running. Check terminal 1 |
| "Network error" | Check API URL in `employerService.js` |
| Button stays loading | Check browser console (F12) for errors |

✓ **Pass**: Step 2 loads successfully

---

### Step 3: Fill Out Step 2 - Company Profile

**Form fields:**
1. **Company Name**: `Tech Solutions Corporation`
2. **Trade Name**: `TechSol` (optional)
3. **Industry**: Select "Information Technology"
4. **Company Size**: Select "Medium (50-199 employees)"

5. **Location:**
   - Province: Select "Pangasinan"
   - City/Municipality: Select "Urdaneta City"
   - Barangay: Select "Rosario District"

6. **Street Address**: `123 Business Avenue, Unit 5`

7. **Description**: 
```
Tech Solutions Corporation specializes in software development 
and IT consulting services for businesses in the Philippines. 
We provide innovative solutions and expert consulting.
```

8. **Logo**: (Optional - can skip for testing)
   - Click "Choose File"
   - Select any image file (or skip)

**To submit:**
1. Click "Continue to Step 3" button
2. Wait for response

**Expected Results:**
- ✓ All fields validated
- ✓ Progress bar shows 50%
- ✓ Step 3: Document Upload page loads
- ✓ Shows required documents (based on "Corporation" type)

**Expected Documents for Corporation:**
- Mayor's Permit
- BIR Certificate
- SEC Certificate
- (PhilJobNet Proof - optional)

✓ **Pass**: Step 3 loads with correct documents

---

### Step 4: Fill Out Step 3 - Upload Documents

This is critical! Each document must be uploaded.

**For Testing (Quick Method):**
Create dummy PDF files or use screenshots:

1. **Mayor's Permit Document:**
   - Drag-and-drop (or click "Select File")
   - Choose any PDF file from your computer
   - Wait for "✓ Uploaded" status

2. **BIR Certificate:**
   - Same as above
   - You can reuse the same file if testing

3. **SEC Certificate:**
   - Same as above

**Expected After Each Upload:**
- File name appears
- Green checkmark shows
- Progress counter updates: "1 of 3", "2 of 3", "3 of 3"

**When All Uploaded:**
- Progress bar shows full green
- "Continue to Step 4" button becomes enabled
- Button text: "Continue to Step 4"

**To submit:**
1. Make sure all 3 documents show ✓
2. Click "Continue to Step 4" button

**Expected Results:**
- ✓ Progress bar shows 75%
- ✓ Step 4: Representative form loads

✓ **Pass**: Step 4 loads after documents uploaded

---

### Step 5: Fill Out Step 4 - Representative Details

**Form fields:**
1. **First Name**: `Juan`
2. **Middle Name**: `Miguel` (optional)
3. **Last Name**: `Santos`
4. **Designation**: `Human Resources Manager`
5. **Contact Number**: `09123456789`

6. **Government ID**: (Required)
   - Click "Choose File"
   - Select an image file (JPG, PNG) or PDF
   - Wait for preview to show

7. **Authorization Letter**: (Optional)
   - Can leave blank for testing
   - Or select a PDF/DOC file

**To submit:**
1. Fill all required fields
2. Upload Government ID
3. Click "Submit Registration for Review" (big green button)
4. Wait for response

**Expected Results:**
- ✓ Form validates
- ✓ Button shows "Submitting Registration..." (loading)
- ✓ Success screen appears with:
  - Green checkmark icon (✓)
  - "Registration Submitted!" title
  - "Your employer account has been submitted for verification"
  - "Go to Dashboard" button

**Success Screen Should Show:**
```
✓ Registration Submitted!

Your employer account has been submitted for verification 
by Urdaneta City PESO.

We will review your documents and send you an email 
notification with the verification result.

Next Steps:
• Wait for email notification (2-3 business days)
• If approved: You can start posting jobs!
• If rejected: You can update documents and resubmit
```

✓ **Pass**: Registration submitted successfully!

---

## ✅ Verify Data Was Saved to Backend

After successful submission, verify the database has the data:

### 1. Check Database Table
Open terminal with backend:

```bash
php artisan tinker
```

Then run:

```php
# Check employers table
>>> DB::table('employers')->latest()->first();

# Should show something like:
=> {
     "id": 1,
     "email": "test@company.com",
     "company_type": "corporation_partnership",
     "company_name": "Tech Solutions Corporation",
     "industry": "IT",
     "company_size": "medium",
     "verification_status": "pending",
     "created_at": "2026-06-06 10:30:00"
   }

# Check documents
>>> DB::table('employer_documents')->where('employer_id', 1)->get();

# Should show 3 documents (one for each upload)
```

### 2. Check Storage Directory

Files should be stored in: `i-peso-backend/storage/app/public/employer_documents/`

Check if files exist:
```bash
cd i-peso-backend
ls storage/app/public/employer_documents/
```

You should see files named like:
```
employers_1_mayors_permit_xyz123.pdf
employers_1_bir_certificate_abc456.pdf
employers_1_sec_certificate_def789.pdf
```

### 3. Use Postman to Check API

Test the employer profile endpoint:

```
GET http://localhost:8000/api/employer/profile/1
```

**Response Should Include:**
```json
{
  "employer": {
    "id": 1,
    "email": "test@company.com",
    "company_name": "Tech Solutions Corporation",
    "verification_status": "pending",
    "documents": [
      {
        "document_type": "mayors_permit",
        "verification_status": "pending"
      },
      {
        "document_type": "bir_certificate",
        "verification_status": "pending"
      },
      {
        "document_type": "sec_certificate",
        "verification_status": "pending"
      }
    ]
  }
}
```

✓ **Pass**: Data saved correctly!

---

## 🧪 Advanced Testing Scenarios

### Scenario 1: Sole Proprietorship Company

Repeat the flow but select "Sole Proprietorship" in Step 1.

**Expected documents in Step 3:**
- Mayor's Permit
- BIR Certificate
- DTI Certificate

(Should be different from Corporation!)

### Scenario 2: Overseas Recruitment Agency

Repeat the flow but select "Overseas Recruitment Agency (POEA/DMW)" in Step 1.

**Expected documents in Step 3:**
- Mayor's Permit
- BIR Certificate
- SEC Certificate
- DME/POEA License

### Scenario 3: Test Error Handling

**Invalid Email:**
1. Type: `notanemail`
2. Click "Continue to Step 2"
3. **Expected**: Error message "Invalid email"

**Short Password:**
1. Type password: `abc123`
2. Click "Continue to Step 2"
3. **Expected**: Error message "Password must be at least 8 characters"

**Missing Required Field:**
1. Leave email blank
2. Click "Continue to Step 2"
3. **Expected**: Error message "Email is required"

### Scenario 4: Test Back Buttons

1. Fill Step 1 → Continue to Step 2
2. Click "Back" button
3. **Expected**: Go back to Step 1 (data preserved)

---

## 📊 Testing Checklist

Print this and check off as you go:

### Step 1 Tests
- [ ] Page loads
- [ ] Form validation works
- [ ] Email field accepts valid email
- [ ] Password validation works (min 8 chars)
- [ ] Company type selection works
- [ ] Continue button works
- [ ] Progress bar shows 25%

### Step 2 Tests
- [ ] Form loads
- [ ] All fields display correctly
- [ ] PSGC cascade works (Province → City → Barangay)
- [ ] Can enter text in all fields
- [ ] Logo preview works (optional)
- [ ] Continue button works
- [ ] Back button works
- [ ] Progress bar shows 50%

### Step 3 Tests
- [ ] Required documents list loads
- [ ] Correct documents shown for company type
- [ ] Progress checklist displays
- [ ] Drag-drop upload works
- [ ] Click to select file works
- [ ] File name shows after upload
- [ ] Green checkmark appears after upload
- [ ] Progress counter updates
- [ ] Button disabled until all docs uploaded
- [ ] Continue button works after all uploaded
- [ ] Back button works
- [ ] Progress bar shows 75%

### Step 4 Tests
- [ ] Form loads with all fields
- [ ] Name fields accept text
- [ ] Government ID file preview shows
- [ ] Auth letter file shows name
- [ ] Submit button works
- [ ] Success screen appears
- [ ] Progress bar shows 100%

### Database Verification
- [ ] Employer record in database
- [ ] Employer documents in database
- [ ] Files in storage directory
- [ ] Can retrieve via API

### Edge Cases
- [ ] Sole Proprietorship shows correct docs
- [ ] Local Agency shows correct docs
- [ ] Overseas Agency shows correct docs
- [ ] Error messages display correctly
- [ ] Back buttons preserve data
- [ ] Mobile responsive

---

## 🐛 Troubleshooting

### Issue: "Failed to register" on Step 1
**Solution:**
1. Check backend running: `php artisan serve`
2. Check console errors (F12)
3. Verify API URL in `src/services/employerService.js`
4. Check Laravel log: `storage/logs/laravel.log`

### Issue: Documents don't show in Step 3
**Solution:**
1. Check company type selected in Step 1
2. Verify backend migrations ran
3. Check API endpoint: `GET /api/employer/required-documents/{id}`
4. Open browser console to see API response

### Issue: File upload fails
**Solution:**
1. Check storage permissions: `chmod -R 775 storage/app/public/`
2. Verify storage link exists: `php artisan storage:link`
3. Check file size (should be under 10MB)
4. Check file type (should be PDF, JPG, PNG)

### Issue: Success screen doesn't appear
**Solution:**
1. Check Step 4 form validation
2. Verify all required fields filled
3. Check government ID file selected
4. Check browser console for errors
5. Check Laravel log for API errors

### Issue: Data not in database
**Solution:**
1. Run migrations: `php artisan migrate`
2. Check if record exists: `php artisan tinker`
3. Run: `DB::table('employers')->count()`
4. Check for validation errors in Laravel log

---

## 🎯 Success Indicators

You'll know everything is working when:

✅ **Frontend:**
- Registration page loads at `/employer/register`
- All 4 steps display correctly
- Forms validate and show errors
- Progress bar updates
- File uploads work with drag-drop
- Success screen appears
- All buttons work (Continue, Back, Submit)

✅ **Backend:**
- Migrations run successfully
- API endpoints return 200 status
- Database records created
- Files stored in `storage/app/public/employer_documents/`
- Documents linked to employer

✅ **Integration:**
- Can complete full flow without errors
- Data flows from UI → Backend → Database
- Correct documents shown for company type
- Verification status shows "pending"

---

## 📱 Testing Different Company Types

Test all 4 company types to ensure conditional logic works:

| Company Type | Required Documents | Test It |
|------|-----------|---------|
| Sole Proprietorship | Mayor's Permit, BIR, DTI | ✓ |
| Corporation | Mayor's Permit, BIR, SEC | ✓ |
| Local Agency | Mayor's Permit, BIR, SEC, PRPA | ✓ |
| Overseas Agency | Mayor's Permit, BIR, SEC, POEA | ✓ |

For each, verify Step 3 shows correct docs.

---

## ✨ Next: Test Admin Portal

After employer registration works, test the admin portal:

1. Navigate to: `/admin/employers/pending`
2. Should see the registered employer
3. Click to review
4. View documents
5. Click "Approve" or "Reject"
6. Verify status changes to "verified" or "rejected"

---

## 📞 Quick Reference

| Screen | URL |
|--------|-----|
| Registration | `http://localhost:5173/employer/register` |
| Success | Same URL after submission |
| Admin Portal | `http://localhost:5173/admin/employers/pending` (not built yet) |

| File to Check | Purpose |
|--------|---------|
| `i-peso-backend/storage/logs/laravel.log` | Backend errors |
| Browser Console (F12) | Frontend errors |
| `i-peso-backend/storage/app/public/employer_documents/` | Uploaded files |

---

**You're ready to test! Good luck! 🚀**

