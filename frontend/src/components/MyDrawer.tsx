import React from 'react'
import './MyDrawer.css'

interface MyDrawerProps {
  open: boolean
  onClose: () => void
  onSelectReports: () => void
  onSelectMessages: () => void
  onLogout: () => void
}

const MyDrawer: React.FC<MyDrawerProps> = ({
  open,
  onClose,
  onSelectReports,
  onSelectMessages,
  onLogout,
}) => {
  if (!open) return null

  return (
    <>
      <div className="my-drawer-overlay" onClick={onClose} />
      <div className="my-drawer">
        <div className="my-drawer-header">
          <h2>我的</h2>
          <button className="my-drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="my-drawer-content">
          <div className="my-drawer-item" onClick={onSelectReports}>
            <div className="my-drawer-item-content">
              <div className="my-drawer-item-title">我的举报</div>
              <div className="my-drawer-item-desc">查看我提交的举报记录</div>
            </div>
            <div className="my-drawer-item-arrow">›</div>
          </div>
          <div className="my-drawer-item" onClick={onSelectMessages}>
            <div className="my-drawer-item-content">
              <div className="my-drawer-item-title">我的消息</div>
              <div className="my-drawer-item-desc">查看聊天会话记录</div>
            </div>
            <div className="my-drawer-item-arrow">›</div>
          </div>
          <div className="my-drawer-divider"></div>
          <div className="my-drawer-item my-drawer-item-logout" onClick={onLogout}>
            <div className="my-drawer-item-content">
              <div className="my-drawer-item-title">退出登录</div>
              <div className="my-drawer-item-desc">安全退出当前账号</div>
            </div>
            <div className="my-drawer-item-arrow">›</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default MyDrawer

