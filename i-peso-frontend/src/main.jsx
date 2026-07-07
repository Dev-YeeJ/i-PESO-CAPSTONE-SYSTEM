// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import '@/assets/styles/main.css'
import { IPESO_LOGO_URL } from '@/components/branding/brandAssets'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      cacheTime: 300_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const favicon = document.querySelector('link[rel="icon"]')
if (favicon) favicon.href = IPESO_LOGO_URL
document.title = 'i-PESO Employment Portal'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
