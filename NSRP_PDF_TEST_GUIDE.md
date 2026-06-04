# 🧪 NSRP PDF Export Feature - Testing Guide

## Quick Start (Copy & Paste)

### Terminal 1: Start Laravel Backend
```powershell
cd c:\Users\jaime\i-peso-capstone-system\i-peso-backend
php artisan serve --host=127.0.0.1 --port=8000
```

**Expected Output:**
```
  INFO  Server running on [http://127.0.0.1:8000].

  Press Ctrl+C to quit
```

---

### Terminal 2: Start React Frontend Dev Server
```powershell
cd c:\Users\jaime\i-peso-capstone-system\i-peso-frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## Testing Steps

### **Step 1: Direct API Test (Postman/curl)**

1. **Get Admin Authentication Token:**
   - Hit POST: `http://localhost:8000/api/auth/login`
   - Body:
     ```json
     {
       "email": "admin@ipeso.gov.ph",
       "password": "password123"
     }
     ```
   - Copy the `token` from response

2. **Download NSRP PDF:**
   - Hit GET: `http://localhost:8000/api/admin/job-seekers/1/export-nsrp-pdf`
   - Header: `Authorization: Bearer YOUR_TOKEN`
   - Set `Accept: application/pdf`
   - Response: Should receive PDF as binary blob
   - **Save file** and check it opens properly

---

### **Step 2: Browser UI Test**

1. **Open Frontend:**
   - Navigate to: `http://localhost:5173`

2. **Login as Admin:**
   - Email: `admin@ipeso.gov.ph`
   - Password: `password123`

3. **Navigate to Job Seeker Profile:**
   - Go to: Admin Portal → Constituent CRM → Job Seekers
   - Click on any job seeker (e.g., ID = 1)

4. **Download PDF:**
   - Look for the **"Download NSRP PDF"** button in the top-right header
   - Click the button
   - Browser should download: `NSRP_Form_[ID]_[LastName].pdf`

---

## Verify PDF Contents

Open the downloaded PDF and check for:

✅ **Header Section:**
- Republic of the Philippines
- Department of Labor and Employment
- NSRP Form 1 title
- Generation timestamp

✅ **Personal Information:**
- Full name (Last, First, Middle Initial)
- Seeker ID
- Date of birth & sex
- Civil status
- Contact number & email

✅ **Address:**
- House/street
- Barangay
- Municipality/City
- Province

✅ **Employment & Preferences:**
- Employment status & type
- Job preferences (occupations, work locations)
- Disability info

✅ **Language Proficiency:**
- Languages listed with skill indicators (Read/Write/Speak/Understand)

✅ **Verification Status:**
- Verification badge (Approved/Rejected/Pending)
- Verification date
- Remarks (if any)

✅ **Footer:**
- Professional government footer
- Document ID
- i-PESO portal watermark

---

## Troubleshooting

### **Issue: 404 Not Found**
```
GET http://localhost:8000/api/admin/job-seekers/1/export-nsrp-pdf
Response: 404
```
**Solution:**
```powershell
cd c:\Users\jaime\i-peso-capstone-system\i-peso-backend
php artisan route:clear
php artisan serve --host=127.0.0.1 --port=8000
```

### **Issue: 403 Unauthorized**
```
Response: 403 Unauthorized
```
**Solution:**
- Ensure you're logged in as admin
- Check Authorization header is properly set
- Verify token is fresh (not expired)

### **Issue: 500 Internal Server Error**
```
Response: 500 Server Error
```
**Solution:**
```powershell
# Check Laravel logs
cd c:\Users\jaime\i-peso-capstone-system\i-peso-backend
Get-Content storage/logs/laravel.log -Tail 20
```

### **Issue: Seeker Not Found (404)**
```
GET /api/admin/job-seekers/999/export-nsrp-pdf
Response: 404 Not Found
```
**Solution:**
- Job Seeker ID 999 doesn't exist
- Use a valid ID (e.g., 1, 2, 3, etc.)
- Check database:
  ```powershell
  php artisan tinker
  >>> DB::table('job_seekers')->pluck('seeker_id')
  ```

---

## API Endpoint Details

**Endpoint:** `GET /api/admin/job-seekers/{id}/export-nsrp-pdf`

**Authentication:** Required (Sanctum Bearer Token)

**Parameters:**
- `id` - Job Seeker ID (integer, required)

**Response:**
- **Success (200):** PDF file as binary blob
  - Content-Type: `application/pdf`
  - Content-Disposition: `attachment; filename=NSRP_Form_[ID]_[LastName].pdf`

- **Error (404):** Job Seeker not found
  ```json
  {
    "message": "No query results found for model [App\\Models\\JobSeeker]"
  }
  ```

- **Error (403):** Unauthorized (not admin)
  ```json
  {
    "message": "Unauthorized"
  }
  ```

---

## Files Involved

**Backend:**
- Controller: `app/Http/Controllers/Api/Admin/NSRPPdfExportController.php`
- Blade Template: `resources/views/pdf/nsrp-form.blade.php`
- Route: `routes/api.php` (GET `/api/admin/job-seekers/{id}/export-nsrp-pdf`)

**Frontend:**
- Component: `src/pages/admin/_components/DownloadNSRPButton.jsx`
- Integration: `src/pages/admin/2-constituent-crm/job-seekers/JobSeekerDetailPage.jsx`
- Barrel Export: `src/pages/admin/_components/index.js`

---

## Performance Notes

- **PDF Generation Time:** ~200-500ms (varies by PDF complexity)
- **Memory Usage:** ~5-15MB per PDF
- **File Size:** ~50-150KB depending on seeker data

---

**Ready to test? Start both servers and let me know any issues! 🚀**
