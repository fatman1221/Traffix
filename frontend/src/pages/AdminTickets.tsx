import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets } from '../api'
import { Ticket } from '../types'
import './AdminTickets.css'

const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadTickets()
  }, [filterStatus, pagination.page])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const data = await getTickets(filterStatus || undefined, pagination.page, pagination.pageSize)
      setTickets(data.items || [])
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.total_pages || 0
      }))
      setLoading(false)
    } catch (err) {
      console.error('加载失败', err)
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

  const getStatusClass = (status: string) => {
    const statusClassMap: Record<string, string> = {
      'pending': 'status-pending',
      'assigned': 'status-assigned',
      'processing': 'status-processing',
      'resolved': 'status-resolved',
      'closed': 'status-closed'
    }
    return statusClassMap[status] || ''
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="admin-tickets-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="admin-tickets-container">
      <div className="tickets-header">
        <h1>工单管理</h1>
        <div className="tickets-count">
          共 {pagination.total} 条
        </div>
      </div>

      <div className="tickets-filters">
        <button
          className={filterStatus === '' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          全部
        </button>
        <button
          className={filterStatus === 'pending' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('pending')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          待处理
        </button>
        <button
          className={filterStatus === 'processing' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('processing')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          处理中
        </button>
        <button
          className={filterStatus === 'resolved' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('resolved')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          已解决
        </button>
        <button
          className={filterStatus === 'closed' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('closed')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          已关闭
        </button>
      </div>

      <div className="tickets-table-container">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>工单号</th>
              <th>事件类型</th>
              <th>地点</th>
              <th>指派部门</th>
              <th>状态</th>
              <th>优先级</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  暂无工单
                </td>
              </tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id}>
                  <td>#{ticket.ticket_no}</td>
                  <td>{ticket.event_type || '-'}</td>
                  <td>{ticket.location || '-'}</td>
                  <td className="dept-cell">
                    {ticket.assigned_department
                      ? `${ticket.assigned_department}${ticket.assigned_unit ? ` / ${ticket.assigned_unit}` : ''}`
                      : '-'}
                  </td>
                  <td>
                    <span className={`status ${getStatusClass(ticket.status)}`}>
                      {getStatusText(ticket.status)}
                    </span>
                  </td>
                  <td>{ticket.priority || '-'}</td>
                  <td>
                    {new Date(ticket.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            上一页
          </button>
          <span className="page-info">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <button
            className="page-btn"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminTickets
