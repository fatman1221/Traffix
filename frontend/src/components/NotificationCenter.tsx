import React from 'react'
import './NotificationCenter.css'

export interface NotificationItem {
  id: number
  type: 'info' | 'success' | 'error'
  message: string
  created_at: string
  read: boolean
}

interface NotificationCenterProps {
  notifications: NotificationItem[]
  open: boolean
  unreadCount: number
  onOpenChange: (open: boolean) => void
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  open,
  unreadCount,
  onOpenChange,
}) => {
  const handleToggle = () => {
    onOpenChange(!open)
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="notification-wrapper">
      <button
        className={`notification-button ${open ? 'active' : ''}`}
        onClick={handleToggle}
        title="消息通知"
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span>消息通知</span>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">暂无通知</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item notification-${n.type} ${
                    n.read ? 'notification-read' : 'notification-unread'
                  }`}
                >
                  <div className="notification-main">
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-time">
                      {formatTime(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter