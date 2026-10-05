import { BrowserRouter } from 'react-router-dom'
import AuthProvider from '@/context/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppRoutes } from '@/router'

export default function App() {
  return (
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
  )
}
