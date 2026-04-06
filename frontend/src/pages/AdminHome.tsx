import React, { useState } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { logout } from '../api'
import './AdminHome.css'

const AdminHome: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems: Array<{ path?: string; label?: string; type?: string }> = [
    { path: '/admin/statistics', label: '数据统计' },
    { path: '/admin/review', label: '人工复核' },
    { path: '/admin/tickets', label: '工单管理' },
    { type: 'divider' },
    { path: '/admin/users', label: '用户管理' },
    { path: '/admin/data', label: '数据管理' },
  ]

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  return (
    <div className="admin-home-container">
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Traffix 管理后台</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={`divider-${index}`} className="nav-divider" />
            }
            return (
              <button
                key={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </div>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  )
}

export default AdminHome

