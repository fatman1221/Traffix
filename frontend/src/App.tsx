import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import PublicHome from './pages/PublicHome'
import AdminHome from './pages/AdminHome'
import AdminStatistics from './pages/AdminStatistics'
import AdminReview from './pages/AdminReview'
import AdminTickets from './pages/AdminTickets'
import AdminTicketDetail from './pages/AdminTicketDetail'
import AdminUsers from './pages/AdminUsers'
import AdminDataManagement from './pages/AdminDataManagement'
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
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminHome />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/statistics" replace />} />
          <Route path="statistics" element={<AdminStatistics />} />
          <Route path="review" element={<AdminReview />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="data" element={<AdminDataManagement />} />
        </Route>
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

