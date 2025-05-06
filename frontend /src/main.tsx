import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import router from './routes'
import React from 'react'
import { Toaster } from "@/components/ui/sonner"

createRoot(document.getElementById('root')!).render(
  <React.Fragment>
    <Toaster />

    <RouterProvider router={router} />
  </React.Fragment>
)
