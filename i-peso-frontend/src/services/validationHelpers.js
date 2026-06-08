// src/services/validationHelpers.js

export const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-400' }
  if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

// ===== EMPLOYER REGISTRATION VALIDATIONS =====

export const validateEmployerStep1 = (f) => {
  const e = {}
  if (!f.email?.trim()) e.email = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = 'Enter a valid email address.'
  if (!f.password) e.password = 'Password is required.'
  else if (f.password.length < 8) e.password = 'Password must be at least 8 characters.'
  if (!f.password_confirmation) e.password_confirmation = 'Please confirm your password.'
  else if (f.password !== f.password_confirmation) e.password_confirmation = 'Passwords do not match.'
  if (!f.company_type) e.company_type = 'Please select a company type.'
  return e
}

export const validateEmployerStep2 = (f) => {
  const e = {}
  if (!f.company_name?.trim()) e.company_name = 'Company name is required.'
  if (!f.tin?.trim()) e.tin = 'TIN is required.'
  else if (!/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(f.tin)) e.tin = 'Use the format 000-000-000-000.'
  if (!f.industry) e.industry = 'Industry is required.'
  if (!f.company_size) e.company_size = 'Company size is required.'
  if (!f.province) e.province = 'Province is required.'
  if (!f.city) e.city = 'City is required.'
  if (!f.barangay) e.barangay = 'Barangay is required.'
  if (!f.street_address?.trim()) e.street_address = 'Street address is required.'
  if (!f.description?.trim()) e.description = 'Company description is required.'
  return e
}

export const validateEmployerStep4 = (f) => {
  const e = {}
  if (!f.first_name?.trim()) e.first_name = 'First name is required.'
  if (!f.last_name?.trim()) e.last_name = 'Last name is required.'
  if (!f.designation?.trim()) e.designation = 'Designation is required.'
  if (!f.contact_number?.trim()) e.contact_number = 'Contact number is required.'
  else if (!/^09\d{9}$/.test(f.contact_number)) e.contact_number = 'Enter a valid PH mobile number.'
  if (!f.government_id) e.government_id = 'Government ID is required.'
  if (f.representative_is_owner === undefined || f.representative_is_owner === '') {
    e.representative_is_owner = 'Please indicate whether the representative is the business owner.'
  }
  if (f.representative_is_owner === '0' && !f.authorization_letter) {
    e.authorization_letter = 'Authorization letter or secretary\'s certificate is required for a non-owner representative.'
  }
  return e
}

export const validateOtp = (otp) => {
  const e = {}
  if (!otp?.trim()) e.otp = 'OTP is required.'
  else if (!/^\d{6}$/.test(otp.trim())) e.otp = 'OTP must be 6 digits.'
  return e
}
