# Junior Developer Startup Guide
## i-PESO Frontend Apps (Web + Mobile)

### ⚠️ Important: Two Separate Apps!

We have **TWO** frontend applications:

| App | Technology | Where | Purpose |
|-----|-----------|-------|---------|
| **i-peso-frontend** | React 18 + Vite | Web browser | Job seekers on desktop/laptop |
| **i-peso-mobile** | React Native + Expo | iPhone/Android phone | Job seekers on mobile app |

**Ask your senior dev which one to start with!**

---

## 🚀 Quick Start: React Web App (Browser)

### Step 1: Open the Frontend Folder
```bash
cd i-peso-frontend
```

### Step 2: Install Dependencies
```bash
npm install
```
⏱️ This takes 2-3 minutes. Go grab coffee! ☕

### Step 3: Start the Development Server
```bash
npm run dev
```

### Step 4: Open in Browser
Look for this in your terminal:
```
Local:   http://localhost:5173/
```
Click it or copy-paste into your browser. You should see the login page!

---

## 📱 Quick Start: React Native Mobile App

### Step 1: Open the Mobile Folder
```bash
cd i-peso-mobile
```

### Step 2: Install Dependencies
```bash
npm install
```
⏱️ This takes 3-5 minutes. ☕

### Step 3: Start Expo
```bash
npm start
```

### Step 4: Open on Your Phone
You'll see a QR code in the terminal. Use your phone:
- **iPhone**: Open Camera app, scan QR code, tap notification
- **Android**: Open Expo app, scan QR code

Or choose from menu:
- Press `i` for iPhone simulator
- Press `a` for Android emulator
- Press `e` for Expo Go (on your phone)

**Note**: Requires Expo Go app installed on phone

---

## 📁 Project Structure

### React Web App (i-peso-frontend)

```
i-peso-frontend/
├── src/
│   ├── pages/              # Page components (login, onboarding, etc.)
│   ├── components/         # Reusable UI components
│   ├── layouts/            # Layout wrappers (header, sidebar, etc.)
│   ├── services/           # API calls to backend
│   ├── stores/             # State management (if using Zustand or similar)
│   ├── constants/          # Fixed values, DOLE skill lists, etc.
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── public/                 # Images, fonts, static files
├── package.json            # Dependencies list
├── vite.config.js          # Build configuration
└── index.html              # HTML template
```

### React Native Mobile App (i-peso-mobile)

```
i-peso-mobile/
├── app/                    # Screens (TypeScript .tsx files)
│   ├── _layout.tsx         # Navigation layout
│   ├── index.tsx           # Home screen
│   ├── modal.tsx           # Modal screen
│   ├── (auth)/             # Login/signup screens
│   └── (seeker)/           # Seeker onboarding screens
├── components/             # Reusable UI components
├── services/               # API calls to backend
├── stores/                 # State management (Zustand)
├── constants/              # Fixed values (same DOLE skills)
├── hooks/                  # Custom React hooks
├── assets/                 # Images, icons, fonts
├── package.json            # Dependencies
├── app.json                # Expo configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 🔑 Key Files to Know

### React Web App (i-peso-frontend)

#### For Job Seeker Onboarding
- **File**: `src/pages/auth/onboarding/SeekerOnboarding.jsx`
- **What it does**: 7-step onboarding form (personal info → education → skills → etc.)
- **When to edit**: Adding new fields, fixing Step 5 bugs, changing validation

#### For API Calls
- **File**: `src/services/` (check what exists)
- **What it does**: Sends data to the Laravel backend
- **Example**: Getting seeker profile, saving education, uploading skills

#### For Styling
- **File**: `src/App.css` and `tailwind.config.js`
- **What it does**: Controls colors, fonts, spacing
- **Styling system**: Tailwind CSS (utility-first CSS framework)

---

### React Native Mobile App (i-peso-mobile)

#### For Job Seeker Onboarding
- **File**: `app/(seeker)/` folder
- **Structure**: Each screen is a separate `.tsx` file
- **Language**: TypeScript (stricter than JavaScript)
- **When to edit**: Adding mobile onboarding screens, fixing layout issues

#### For Navigation
- **File**: `app/_layout.tsx`
- **What it does**: Sets up app navigation structure (tabs, screens, auth flow)
- **Routing**: Uses Expo Router (file-based routing like Next.js)

#### For API Calls
- **File**: `services/` folder (same as web app, can share code)
- **What it does**: Sends data to the Laravel backend
- **Reused**: Same backend API as web app!

#### For Styling
- **File**: `tailwind.config.js`
- **What it does**: Controls colors, fonts, spacing
- **Styling system**: NativeWind (Tailwind for React Native)
- **Different from web**: Uses React Native views, not HTML elements

---

## 🔄 Important: Shared Code

Both apps use:
- ✅ Same backend (Laravel API)
- ✅ Same DOLE skill lists (constants)
- ✅ Same API service logic (services can be shared)
- ❌ Different UI components (React vs React Native)
- ❌ Different styling (CSS vs NativeWind)
- ❌ Different navigation (React Router vs Expo Router)

---

## 📝 Common Tasks

### Task 1: Fix a Bug in Step 5 (Education & Skills)

#### Web App (React)
1. Open `i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx`
2. Find the Step 5 section (search for "Step 5")
3. Look for the component code around lines 1045-1410
4. Make your changes
5. Save (Ctrl+S)
6. Browser auto-refreshes! See the change instantly

#### Mobile App (React Native)
1. Open `i-peso-mobile/app/(seeker)/` folder
2. Find the onboarding screen file (e.g., `step5.tsx`)
3. Edit the TypeScript/JSX code
4. Save (Ctrl+S)
5. App hot-reloads on your phone/emulator

### Task 2: Test the Form

#### Web App
1. Go to http://localhost:5173
2. Login with test account
3. Start the 7-step onboarding
4. Fill in fields and submit each step
5. If something breaks, check browser console (F12)

#### Mobile App
1. Scan QR code or use emulator
2. Login with same test account
3. Start the onboarding
4. Test on actual phone features (camera, keyboard, etc.)
5. If something breaks, check Expo console in terminal

### Task 3: Call a New API Endpoint

#### Web App
1. Open `i-peso-frontend/src/services/` folder
2. Create or edit the service file (e.g., `seekerService.js`)
3. Add a new function:
```javascript
export const fetchUserSkills = async () => {
  const response = await fetch('/api/seeker/skills', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  return response.json()
}
```
4. Import and use in your component

#### Mobile App
1. Open `i-peso-mobile/services/` folder
2. Create or edit the service file (e.g., `seekerService.ts`)
3. Add a new function (TypeScript):
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

export const fetchUserSkills = async () => {
  const token = await AsyncStorage.getItem('authToken')
  const response = await fetch('http://localhost:8000/api/seeker/skills', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.json()
}
```
4. Import and use in your screen

### Task 4: Change Styling

#### Web App
1. Find the element in the JSX
2. Look for `className="..."` with Tailwind classes
3. Common Tailwind examples:
   - `bg-blue-500` = blue background
   - `text-white` = white text
   - `p-4` = padding
   - `rounded-lg` = rounded corners
   - `shadow-lg` = drop shadow
4. Save and see changes instantly

#### Mobile App
1. Find the component in the `.tsx` file
2. Look for `className="..."` with NativeWind classes (same as web!)
3. Same Tailwind classes work on mobile:
   - `bg-blue-500` = blue background
   - `text-white` = white text
   - `p-4` = padding
   - `rounded-lg` = rounded corners
4. Save and app hot-reloads

---

## 🐛 When Things Break

### Web App Problems

#### Problem: "Cannot find module..."
**Solution**: Run `npm install` again
```bash
cd i-peso-frontend
npm install
```

#### Problem: Port 5173 already in use
**Solution**: Use a different port
```bash
npm run dev -- --port 3000
```

#### Problem: Blank page or nothing loads
**Solution**: Check browser console (F12)
- Click "Console" tab
- Look for red error messages
- Screenshot the error and ask senior dev

#### Problem: Styling looks weird
**Solution**: Hard refresh browser
- Windows/Linux: Ctrl+Shift+Delete
- Mac: Cmd+Shift+Delete

### Mobile App Problems

#### Problem: QR code won't scan
**Solution**:
- Make sure Expo Go app is installed on your phone
- Try pressing `i` (iPhone) or `a` (Android) in terminal to use simulator instead
- Check both phone and computer are on same WiFi

#### Problem: App won't load on phone
**Solution**:
- Check terminal shows "Tunnel ready" or "LAN ready"
- If "LAN", you might need same WiFi network
- Try using `npm start -- --clear` to clear cache
- Restart Expo Go app on phone

#### Problem: "Cannot find module" error on mobile
**Solution**: Clear cache and reinstall
```bash
cd i-peso-mobile
npm install
npm start -- --clear
```

#### Problem: TypeScript errors in mobile app
**Solution**: Check the error message carefully
- Red squiggly lines = type mismatch (e.g., string vs number)
- Ask senior dev to explain TypeScript basics
- Common fix: Add type annotations

#### Problem: Hot reload not working
**Solution**: Force reload
- Press `r` in Expo terminal
- Or shake phone and tap "Reload"

#### Problem: "Backend not responding"
**Solution**: Check if Laravel backend is running
```bash
# In another terminal, go to backend folder
cd i-peso-backend
php artisan serve
```

---

## 🔗 Connecting to Backend

### Both Web and Mobile Apps Use Same Backend

#### Step 1: Make Sure Backend is Running
```bash
cd i-peso-backend
php artisan serve
```
You should see: `Server running on [http://127.0.0.1:8000]`

#### Step 2: Web App Backend URL
Look for API calls in `i-peso-frontend/src/services/`
```javascript
// Example
const API_URL = 'http://localhost:8000/api'

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return response.json()
}
```

#### Step 3: Mobile App Backend URL
Look for API calls in `i-peso-mobile/services/`
```typescript
// Mobile uses same backend URL
const API_URL = 'http://localhost:8000/api'

export const loginUser = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return response.json()
}
```

#### Step 4: If Backend API Returns Error
- Check backend logs: `i-peso-backend/storage/logs/laravel.log`
- Verify backend server is running
- Check if endpoint exists in backend routes
- If error persists, ask senior dev

---

## 📚 Useful Commands

### Web App Commands
```bash
cd i-peso-frontend

# Start development server
npm run dev

# Build for production
npm run build

# Format code (make it look nice)
npm run lint

# Install a new package
npm install package-name
```

### Mobile App Commands
```bash
cd i-peso-mobile

# Start Expo
npm start

# Start with clear cache
npm start -- --clear

# Build for production
npm run build

# Format code
npm run lint

# Install a new package
npm install package-name
```

### Backend Commands
```bash
cd i-peso-backend

# Start Laravel development server
php artisan serve

# Run migrations
php artisan migrate

# Create database backup
php artisan tinker

# Check logs
tail -f storage/logs/laravel.log
```

---

## 🎓 Understanding the Onboarding Flow

The 7-step form is implemented in:
- **Web**: `i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx`
- **Mobile**: `i-peso-mobile/app/(seeker)/` screens

```
Step 1: Personal Information
  ↓ (Save to backend)
Step 2: Contact Information  
  ↓ (Save to backend)
Step 3: Employment Status
  ↓ (Save to backend)
Step 4: Job Preferences
  ↓ (Save to backend)
Step 5: Education & Skills 🎯 (Recently fixed!)
  ↓ (Save to backend)
Step 6: Work Experience
  ↓ (Save to backend)
Step 7: Review & Submit
  ↓ (Final save)
Success! ✅
```

Each step:
1. User fills form
2. Validates data
3. Sends to backend API
4. Backend saves to database
5. Moves to next step

**Step 5 Details** (Skills section just fixed):
- DOLE Standard Skills: Checkboxes (select multiple)
- Technical Skills: Add with Enter key
- Soft Skills: Add with Enter key
- Each type stored separately in database

---

## 🧪 Testing Checklist

### Web App Testing
Before you submit work, test these:

- [ ] Can login successfully at http://localhost:5173?
- [ ] Can start the 7-step onboarding?
- [ ] Can fill out each step without errors?
- [ ] Can submit each step?
- [ ] Step 5 works (skills, education)?
  - [ ] Can select DOLE skills?
  - [ ] Can add technical skills with Enter?
  - [ ] Can add soft skills with Enter?
  - [ ] Can remove skills?
- [ ] Form data saves to backend?
- [ ] Can reload page and form pre-fills?
- [ ] No console errors (F12)?

### Mobile App Testing
- [ ] Can login successfully on phone/emulator?
- [ ] Can start the 7-step onboarding?
- [ ] Can fill out each step without errors?
- [ ] Can submit each step?
- [ ] Step 5 works on mobile?
  - [ ] DOLE skills render on small screen?
  - [ ] Can add technical skills with keyboard?
  - [ ] Can add soft skills with keyboard?
  - [ ] Can remove skills on mobile?
- [ ] No console errors in Expo terminal?
- [ ] Form pre-fills when reopened?

---

## 💬 Getting Help

### If Something Breaks:

#### For Web App:
1. **Check the console** (F12 → Console tab)
2. **Copy the error message** and search Google
3. **Check backend logs**: `i-peso-backend/storage/logs/laravel.log`

#### For Mobile App:
1. **Check Expo terminal** for error messages
2. **Check phone console** (shake device, tap "Toggle Element Inspector")
3. **Check backend logs**: `i-peso-backend/storage/logs/laravel.log`

#### Always:
4. **Ask senior dev** with:
   - What you were trying to do
   - The exact error message
   - A screenshot

### Documentation:
- React basics: https://react.dev
- React Native: https://reactnative.dev
- Tailwind CSS: https://tailwindcss.com
- NativeWind (Tailwind for mobile): https://www.nativewind.dev
- Vite (build tool): https://vitejs.dev
- Expo (mobile framework): https://docs.expo.dev
- Check existing code comments for hints

---

## 🔐 Important: Test Account

For testing both apps:
1. Ask senior dev for test credentials
2. Or check `i-peso-backend/README.md` for seeding test data
3. Use same account to login on web AND mobile

---

## 📋 Your First Day Tasks

### Morning:
- [ ] Clone/open the project in VS Code
- [ ] Ask which app to work on (web or mobile)
- [ ] Run `npm install` in that app folder
- [ ] Run dev server (`npm run dev` or `npm start`)
- [ ] Confirm app works (screenshot)
- [ ] Set up backend: `cd i-peso-backend && php artisan serve`

### Afternoon:
- [ ] Login with test account
- [ ] Go through all 7 onboarding steps
- [ ] Note any bugs or issues
- [ ] Ask senior dev which bug to fix first

### Next Day:
- [ ] Pick a bug
- [ ] Find it in the code
- [ ] Fix it
- [ ] Test on both web and mobile (if applicable)
- [ ] Submit pull request or tell senior dev

---

## 🎯 Step 5 (Skills) - Special Notes

**Recently fixed! This is what you might be working on:**

The skills section now has:
1. **DOLE Skills** - Official government vocational skills
   - Rendered as checkboxes
   - Select multiple by clicking
   - Example: Auto Mechanic, Electrician, Carpentry

2. **Technical Skills** - Custom professional skills
   - Type skill name
   - Press Enter to add
   - Each skill shows as a blue pill/tag
   - Click X to remove

3. **Soft Skills** - Interpersonal skills
   - Type skill name  
   - Press Enter to add
   - Each skill shows as a purple pill/tag
   - Click X to remove

**Backend expects**:
```json
{
  "dole_skills": ["Auto Mechanic", "Electrician"],
  "technical_skills": ["React", "TypeScript"],
  "soft_skills": ["Leadership", "Communication"]
}
```

---

## 🚨 STOP - Important!

Before you start coding:
1. ✅ Confirm backend is running
2. ✅ Confirm npm packages installed
3. ✅ Confirm app works (localhost:5173 for web, or Expo QR for mobile)
4. ✅ Ask senior dev which app to work on first (web or mobile)
5. ✅ Ask senior dev which feature/bug to work on
6. ✅ Read the code comments in the file you're editing

---

## 💡 Quick Reference: Which App?

**Working on Job Seeker Onboarding Form?**
- **Web version**: `cd i-peso-frontend` → Edit `.jsx` files → Run `npm run dev`
- **Mobile version**: `cd i-peso-mobile` → Edit `.tsx` files → Run `npm start`
- **Both**: Make sure backend API works for both!

**Working on Skills Section (Step 5)?**
- **Web**: `i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx` (lines 1045-1410)
- **Mobile**: `i-peso-mobile/app/(seeker)/step5.tsx` or similar
- **Backend API**: Same for both - check `i-peso-backend/app/Http/Controllers/Api/SeekerController.php`

---

## ✅ You're Ready!

Once you've completed the Morning tasks above, you're ready to start contributing!

**Welcome to the team! 🎉**

### Need Help?
- Check the COMPLETE_IMPLEMENTATION_GUIDE.md for technical details
- Check the ADMIN_PDF_EXPORT_GUIDE.md for PDF export features
- Ask your senior dev for code review

### Three Apps to Know:
1. **i-peso-frontend** - Web React app
2. **i-peso-mobile** - Mobile React Native app (Expo)
3. **i-peso-backend** - Laravel API server (powers both!)

Now go build something amazing! 🚀

