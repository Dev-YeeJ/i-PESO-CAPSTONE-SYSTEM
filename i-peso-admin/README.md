# i-PESO Admin Dashboard

Separate admin application for the i-PESO job matching platform. Completely isolated from user-facing application.

## Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run dev server (runs on port 5174)
npm run dev

# Build for production
npm build
```

## Development

The admin app runs on **http://localhost:5174** and communicates with the backend API at **http://localhost:8000/api**.

### Architecture
- **Auth**: Zustand store with Sanctum token support
- **API**: Axios client with auto-token injection
- **Routing**: React Router v6 with guards for admin-only access
- **UI**: Minimal inline styles (can be enhanced with Tailwind/CSS framework)

### Pages
- `/login` - Admin login
- `/dashboard` - Main dashboard with stats
- `/users` - Manage job seekers and employers
- `/jobs` - Moderate job postings
- `/reports` - Analytics and reports

## Features

- Admin-only authentication
- Token persistence in localStorage
- Role-based access control
- Sidebar navigation
- Responsive layout

## Notes

- This app is **completely separate** from the user-facing app (i-peso-frontend)
- Admin token stored as `ipeso_admin_token` (different from user token)
- Auth store uses `ipeso-admin-auth` for persistence
- Logout clears admin session from both memory and storage

## Backend Integration

Requires Laravel admin routes with role check:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AdminController::class, 'me']);
    
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::get('/admin/jobs', [AdminController::class, 'jobs']);
        Route::get('/admin/reports', [AdminController::class, 'reports']);
    });
});
```
