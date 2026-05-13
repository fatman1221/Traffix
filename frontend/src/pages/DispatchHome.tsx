import React, { useState } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { logout } from '../api'
import './DispatchHome.css'

const DispatchHome: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems: Array<{ path?: string; label?: string }> = [
    { path: '/dispatch/statistics', label: '运行总览' },
    { path: '/dispatch/review', label: '事件复核' },
    { path: '/dispatch/tickets', label: '调度工单' },
  ]

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="dispatch-home-container">
      <div className={`dispatch-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>学校后勤调度中心</h2>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path!) ? 'active' : ''}`}
              onClick={() => navigate(item.path!)}
            >
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </div>
      <div className="dispatch-content">
        <Outlet />
      </div>
    </div>
  )
}

export default DispatchHome
