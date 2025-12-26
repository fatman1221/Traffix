import React from 'react'
import { ChatSession } from '../types'
import './HistoryPanel.css'

interface HistoryPanelProps {
  sessions: ChatSession[]
  currentSessionId: number | null
  onSelectSession: (sessionId: number) => void
  onNewSession: () => void
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession
}) => {
  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>历史记录</h3>
        <button className="new-session-button" onClick={onNewSession}>
          + 新建
        </button>
      </div>
      
      <div className="history-list">
        {sessions.length === 0 ? (
          <div className="empty-history">
            <p>暂无历史记录</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`history-item ${
                currentSessionId === session.id ? 'active' : ''
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="history-item-title">
                {session.title || '新对话'}
              </div>
              <div className="history-item-time">
                {new Date(session.created_at).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default HistoryPanel

