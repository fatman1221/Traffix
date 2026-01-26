import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets, logout } from '../api'
import { Ticket } from '../types'
import './AdminTickets.css'

const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadTickets()
  }, [filterStatus])

  const loadTickets = async () => {
    try {
      const data = await getTickets(filterStatus || undefined)
      setTickets(data)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '待处理',
      'assigned': '已指派',
      'processing': '处理中',
      'resolved': '已解决',
      'closed': '已关闭'
    }
    return statusMap[status] || status
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="admin-tickets-container">
      <div className="header">
        <h1>工单管理</h1>
        <div className="header-actions">
          <button onClick={handleLogout}>退出</button>
        </div>
      </div>

      <div className="filters">
        <button
          className={filterStatus === '' ? 'active' : ''}
          onClick={() => setFilterStatus('')}
        >
          全部
        </button>
        <button
          className={filterStatus === 'pending' ? 'active' : ''}
          onClick={() => setFilterStatus('pending')}
        >
          待处理
        </button>
        <button
          className={filterStatus === 'processing' ? 'active' : ''}
          onClick={() => setFilterStatus('processing')}
        >
          处理中
        </button>
        <button
          className={filterStatus === 'resolved' ? 'active' : ''}
          onClick={() => setFilterStatus('resolved')}
        >
          已解决
        </button>
      </div>

      <div className="tickets-list">
        {tickets.length === 0 ? (
          <div className="empty">暂无工单</div>
        ) : (
          tickets.map(ticket => (
            <div
              key={ticket.id}
              className="ticket-item"
              onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
            >
              <div className="ticket-header">
                <span className="ticket-no">{ticket.ticket_no}</span>
                <span className={`status status-${ticket.status}`}>
                  {getStatusText(ticket.status)}
                </span>
              </div>
              {ticket.event_type && (
                <div className="ticket-field">
                  <strong>事件类型：</strong>{ticket.event_type}
                </div>
              )}
              {ticket.location && (
                <div className="ticket-field">
                  <strong>地点：</strong>{ticket.location}
                </div>
              )}
              <div className="ticket-time">
                {new Date(ticket.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AdminTickets

