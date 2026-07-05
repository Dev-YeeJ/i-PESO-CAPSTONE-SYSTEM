// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import '@/assets/styles/main.css'
import { IPESO_LOGO_URL } from '@/components/branding/brandAssets'

const favicon = document.querySelector('link[rel="icon"]')
if (favicon) favicon.href = IPESO_LOGO_URL
document.title = 'i-PESO Employment Portal'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
