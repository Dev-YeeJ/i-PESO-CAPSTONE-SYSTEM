const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export const IPESO_LOGO_URL = import.meta.env.VITE_IPESO_LOGO_URL
  || `${apiBaseUrl.replace(/\/api\/?$/, '')}/i_peso_app_icon_1024.png`
