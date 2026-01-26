import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import PublicHome from './pages/PublicHome'
import AdminTickets from './pages/AdminTickets'
import AdminTicketDetail from './pages/AdminTicketDetail'
import ChatInterface from './components/ChatInterface'
import './App.css'

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'public' | 'admin' }> = ({ 
  children, 
  requiredRole 
}) => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />
  }
  
  if (requiredRole) {
    const user = JSON.parse(userStr)
    if (user.role !== requiredRole) {
      return <Navigate to="/login" replace />
    }
  }
  
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/public" 
          element={
            <ProtectedRoute requiredRole="public">
              <PublicHome />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/tickets" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTickets />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/tickets/:ticketId" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTicketDetail />
            </ProtectedRoute>
          } 
        />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

