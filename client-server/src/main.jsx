import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { TasksProvider } from './contexts/TasksContext.jsx'
import { ThemeProvider } from './contexts/ThemeProvider.jsx'

const router = createBrowserRouter([{ path: '/*', element: <AuthProvider><ThemeProvider><TasksProvider><App /></TasksProvider></ThemeProvider></AuthProvider> }])

createRoot(document.getElementById('root')).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>,
)
