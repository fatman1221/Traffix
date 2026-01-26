import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api'
import ChatInterface from '../components/ChatInterface'
import PublicReport from './PublicReport'
import MyReports from './MyReports'
import './PublicHome.css'

const PublicHome: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'report' | 'my'>('chat')
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="public-home-container">
      <div className="public-header">
        <h1>交通事件感知系统</h1>
        <button className="logout-btn" onClick={handleLogout}>退出</button>
      </div>

      <div className="public-content">
        {activeTab === 'chat' && (
          <div className="chat-container">
            <ChatInterface />
          </div>
        )}
        {activeTab === 'report' && (
          <div className="report-container">
            <PublicReport />
          </div>
        )}
        {activeTab === 'my' && (
          <div className="my-reports-wrapper">
            <MyReports />
          </div>
        )}
      </div>

      <div className="public-tabs">
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          💬 智能问答
        </button>
        <button
          className={activeTab === 'report' ? 'active' : ''}
          onClick={() => setActiveTab('report')}
        >
          📷 事件上报
        </button>
        <button
          className={activeTab === 'my' ? 'active' : ''}
          onClick={() => setActiveTab('my')}
        >
          📋 我的举报
        </button>
      </div>
    </div>
  )
}

export default PublicHome

