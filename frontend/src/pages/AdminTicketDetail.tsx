import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicketDetail, reviewReport, updateTicket, logout } from '../api'
import './AdminTicketDetail.css'

const AdminTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviewResult, setReviewResult] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [newPriority, setNewPriority] = useState('')
  const [comment, setComment] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (ticketId) {
      loadTicketDetail()
    }
  }, [ticketId])

  const loadTicketDetail = async () => {
    try {
      const data = await getTicketDetail(Number(ticketId))
      setTicket(data)
      setNewStatus(data.status)
      setNewPriority(data.priority)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async () => {
    if (!ticket?.report?.id || !reviewResult) {
      alert('请选择审核结果')
      return
    }

    try {
      await reviewReport(ticket.report.id, reviewResult, reviewComment)
      alert('审核完成')
      loadTicketDetail()
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败')
    }
  }

  const handleUpdateTicket = async () => {
    if (!ticketId) return

    try {
      await updateTicket(Number(ticketId), newStatus, undefined, newPriority, comment)
      alert('更新成功')
      loadTicketDetail()
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!ticket) {
    return <div className="error">工单不存在</div>
  }

  return (
    <div className="ticket-detail-container">
      <div className="header">
        <h1>工单详情 - {ticket.ticket_no}</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/admin/tickets')}>返回列表</button>
          <button onClick={handleLogout}>退出</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h2>基本信息</h2>
          <div className="info-grid">
            <div><strong>工单编号：</strong>{ticket.ticket_no}</div>
            <div><strong>事件类型：</strong>{ticket.event_type || '未指定'}</div>
            <div><strong>地点：</strong>{ticket.location || '未指定'}</div>
            <div><strong>状态：</strong>{ticket.status}</div>
            <div><strong>优先级：</strong>{ticket.priority}</div>
          </div>
        </div>

        {ticket.images && ticket.images.length > 0 && (
          <div className="detail-section">
            <h2>图片</h2>
            <div className="images-grid">
              {ticket.images.map((img: string, idx: number) => (
                <img key={idx} src={`http://127.0.0.1:8000/uploads/${img.split('/').pop()}`} alt={`图片${idx + 1}`} />
              ))}
            </div>
          </div>
        )}

        {ticket.recognition_results && ticket.recognition_results.length > 0 && (
          <div className="detail-section">
            <h2>模型识别结果</h2>
            {ticket.recognition_results.map((result: any, idx: number) => (
              <div key={idx} className="recognition-result">
                <div><strong>问题：</strong>{result.question}</div>
                <div><strong>回答：</strong>{result.answer}</div>
                {result.event_type_detected && (
                  <div><strong>检测到事件类型：</strong>{result.event_type_detected}</div>
                )}
                {result.confidence && (
                  <div><strong>置信度：</strong>{(result.confidence * 100).toFixed(2)}%</div>
                )}
              </div>
            ))}
          </div>
        )}

        {ticket.report && ticket.report.status === 'manual_review' && (
          <div className="detail-section">
            <h2>人工复核</h2>
            <div className="review-form">
              <select value={reviewResult} onChange={(e) => setReviewResult(e.target.value)}>
                <option value="">请选择审核结果</option>
                <option value="approved">通过</option>
                <option value="rejected">拒绝</option>
                <option value="need_review">需复核</option>
              </select>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="审核意见（可选）"
                rows={3}
              />
              <button onClick={handleReview}>提交审核</button>
            </div>
          </div>
        )}

        <div className="detail-section">
          <h2>更新工单</h2>
          <div className="update-form">
            <div>
              <label>状态：</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="pending">待处理</option>
                <option value="assigned">已指派</option>
                <option value="processing">处理中</option>
                <option value="resolved">已解决</option>
                <option value="closed">已关闭</option>
              </select>
            </div>
            <div>
              <label>优先级：</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label>处理意见：</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="处理意见（可选）"
                rows={3}
              />
            </div>
            <button onClick={handleUpdateTicket}>更新工单</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminTicketDetail

