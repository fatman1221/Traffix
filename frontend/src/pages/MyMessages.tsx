import React, { useEffect } from 'react'
import { NotificationItem } from '../components/NotificationCenter'
import './MyMessages.css'

interface MyMessagesProps {
  notifications: NotificationItem[]
  onMarkAsRead: () => void
}

const MyMessages: React.FC<MyMessagesProps> = ({ notifications, onMarkAsRead }) => {
  useEffect(() => {
    // 进入页面时标记所有通知为已读
    onMarkAsRead()
  }, [onMarkAsRead])

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (minutes < 1) {
        return '刚刚'
      } else if (minutes < 60) {
        return `${minutes}分钟前`
      } else if (hours < 24) {
        return `${hours}小时前`
      } else if (days === 1) {
        return '昨天'
      } else if (days < 7) {
        return `${days}天前`
      } else {
        return date.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
        })
      }
    } catch {
      return ''
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="my-messages-container">
        <div className="my-messages-empty">
          <p>暂无消息通知</p>
          <p className="my-messages-empty-hint">系统消息将在这里显示</p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-messages-container">
      <div className="my-messages-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`my-messages-item my-messages-${notification.type} ${
              notification.read ? 'my-messages-read' : 'my-messages-unread'
            }`}
          >
            <div className="my-messages-item-content">
              <div className="my-messages-item-title">{notification.message}</div>
              <div className="my-messages-item-time">
                {formatTime(notification.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyMessages

