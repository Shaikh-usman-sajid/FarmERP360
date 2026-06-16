'use client'
import './globals.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
  }))

  return (
    <html lang="en">
      <head>
        <title>FarmERP360</title>
        <meta name="description" content="Enterprise Livestock ERP Platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
        </QueryClientProvider>
      </body>
    </html>
  )
}
