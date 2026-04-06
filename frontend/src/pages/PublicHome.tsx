import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api'
import ChatInterface from '../components/ChatInterface'
import PublicReport from './PublicReport'
import MyReports from './MyReports'
import MyMessages from './MyMessages'
import MyDrawer from '../components/MyDrawer'
import { NotificationItem } from '../components/NotificationCenter'
import './PublicHome.css'

const PublicHome: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'report' | 'my-reports' | 'my-messages'>('chat')
  const [showDrawer, setShowDrawer] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const navigate = useNavigate()

  const addNotification = (type: NotificationItem['type'], message: string) => {
    setNotifications(prev => [
      {
        id: Date.now(),
        type,
        message,
        created_at: new Date().toISOString(),
        read: false
      },
      ...prev
    ])
  }

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleOpenDrawer = () => {
    setShowDrawer(true)
  }

  const handleCloseDrawer = () => {
    setShowDrawer(false)
  }

  const handleSelectReports = () => {
    setActiveTab('my-reports')
    setShowDrawer(false)
  }

  const handleSelectMessages = () => {
    setActiveTab('my-messages')
    setShowDrawer(false)
  }

  return (
    <div className="public-home-container">
      <div className="public-header">
        <h1>交通事件感知系统</h1>
      </div>

      <div className="public-content">
        {activeTab === 'chat' && (
          <div className="chat-container">
            <ChatInterface 
              notifications={notifications}
              onAddNotification={addNotification}
              onMarkNotificationsAsRead={markNotificationsAsRead}
            />
          </div>
        )}
        {activeTab === 'report' && (
          <div className="report-container">
            <PublicReport />
          </div>
        )}
        {activeTab === 'my-reports' && (
          <div className="my-reports-wrapper">
            <MyReports />
          </div>
        )}
        {activeTab === 'my-messages' && (
          <div className="my-messages-wrapper">
            <MyMessages 
              notifications={notifications}
              onMarkAsRead={markNotificationsAsRead}
            />
          </div>
        )}
      </div>

      <div className="public-tabs">
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          智能问答
        </button>
        <button
          className={activeTab === 'report' ? 'active' : ''}
          onClick={() => setActiveTab('report')}
        >
          事件上报
        </button>
      </div>

      {/* 右下角浮动按钮 */}
      <button className="my-float-button" onClick={handleOpenDrawer}>
        我的
      </button>

      {/* 我的抽屉 */}
      <MyDrawer
        open={showDrawer}
        onClose={handleCloseDrawer}
        onSelectReports={handleSelectReports}
        onSelectMessages={handleSelectMessages}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default PublicHome

