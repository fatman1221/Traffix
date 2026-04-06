import React, { useState, useEffect } from 'react'
import { reviewReport, getReports, getReportDetail } from '../api'
import { uploadPublicUrl } from '../utils/uploadUrl'
import './AdminReview.css'

interface ReviewItem {
  id: number
  report_id: number
  user_id: number
  username: string
  event_type?: string
  location?: string
  description?: string
  status: string
  images: string[]
  recognition_results?: Array<{
    question: string
    answer: string
    event_type_detected?: string
    confidence?: number
  }>
  auto_review_result?: string
  auto_review_confidence?: number
  created_at: string
}

const AdminReview: React.FC = () => {
  const [reports, setReports] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<ReviewItem | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [reviewResult, setReviewResult] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('pending_review')
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    loadReports()
  }, [filterStatus, pagination.page])

  const loadReports = async () => {
    try {
      setLoading(true)
      const data = await getReports(filterStatus || undefined, pagination.page, pagination.pageSize)
      setReports(data.items || [])
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.total_pages || 0
      }))
      setLoading(false)
    } catch (error) {
      console.error('加载举报列表失败:', error)
      setLoading(false)
    }
  }

  const handleViewDetail = async (reportId: number) => {
    try {
      const data = await getReportDetail(reportId)
      setSelectedReport(data)
      setShowDetail(true)
      setReviewResult('')
      setReviewComment('')
    } catch (error) {
      console.error('加载详情失败:', error)
      alert('加载详情失败')
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedReport || !reviewResult) {
      alert('请选择审核结果')
      return
    }

    try {
      await reviewReport(selectedReport.report_id, reviewResult, reviewComment)
      alert('审核完成')
      setShowDetail(false)
      setSelectedReport(null)
      loadReports()
    } catch (error: any) {
      alert(error.response?.data?.detail || '审核失败')
    }
  }

  const getImageUrl = (imagePath: string) => uploadPublicUrl(imagePath)

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '待审核',
      'manual_review': '待复核',
      'approved': '已通过',
      'rejected': '已驳回',
      'auto_approved': '自动通过',
      'auto_rejected': '自动驳回',
      'closed': '已关闭'
    }
    return statusMap[status] || status
  }

  const getStatusClass = (status: string) => {
    const statusClassMap: Record<string, string> = {
      'pending': 'status-pending',
      'manual_review': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'auto_approved': 'status-approved',
      'auto_rejected': 'status-rejected',
      'closed': 'status-closed'
    }
    return statusClassMap[status] || ''
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  if (loading && reports.length === 0) {
    return (
      <div className="admin-review-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="admin-review-container">
      <div className="review-header">
        <h1>人工复核</h1>
        <div className="review-count">
          共 {pagination.total} 条
        </div>
      </div>

      <div className="review-filters">
        <button
          className={filterStatus === '' ? 'active' : ''}
          onClick={() => setFilterStatus('')}
        >
          全部
        </button>
        <button
          className={filterStatus === 'pending_review' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('pending_review')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          待审核
        </button>
        <button
          className={filterStatus === 'approved' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('approved')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          已通过
        </button>
        <button
          className={filterStatus === 'rejected' ? 'active' : ''}
          onClick={() => {
            setFilterStatus('rejected')
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          已驳回
        </button>
      </div>

      <div className="review-table-container">
        <table className="review-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>举报人</th>
              <th>事件类型</th>
              <th>地点</th>
              <th>系统识别</th>
              <th>状态</th>
              <th>上报时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  暂无数据
                </td>
              </tr>
            ) : (
              reports.map(report => (
                <tr key={report.id}>
                  <td>#{report.report_id}</td>
                  <td>{report.username}</td>
                  <td>{report.event_type || '-'}</td>
                  <td>{report.location || '-'}</td>
                  <td>
                    {report.recognition_results && report.recognition_results.length > 0
                      ? report.recognition_results[0].event_type_detected || '未识别'
                      : '-'}
                    {report.auto_review_confidence && (
                      <span className="confidence">
                        ({(report.auto_review_confidence * 100).toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`status ${getStatusClass(report.status)}`}>
                      {getStatusText(report.status)}
                    </span>
                  </td>
                  <td>
                    {new Date(report.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => handleViewDetail(report.report_id)}
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

      {showDetail && selectedReport && (
        <div className="detail-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <h2>举报详情 - #{selectedReport.report_id}</h2>
              <button
                className="close-btn"
                onClick={() => setShowDetail(false)}
              >
                ×
              </button>
            </div>

            <div className="detail-sections">
              <div className="detail-section">
                <h3>用户上报内容</h3>
                <div className="info-grid">
                  <div><strong>举报人：</strong>{selectedReport.username}</div>
                  {selectedReport.event_type && (
                    <div><strong>事件类型：</strong>{selectedReport.event_type}</div>
                  )}
                  {selectedReport.location && (
                    <div><strong>地点：</strong>{selectedReport.location}</div>
                  )}
                  {selectedReport.description && (
                    <div><strong>描述：</strong>{selectedReport.description}</div>
                  )}
                  <div><strong>状态：</strong>
                    <span className={`status ${getStatusClass(selectedReport.status)}`}>
                      {getStatusText(selectedReport.status)}
                    </span>
                  </div>
                  <div><strong>上报时间：</strong>
                    {new Date(selectedReport.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>

              {selectedReport.images && selectedReport.images.length > 0 && (
                <div className="detail-section">
                  <h3>上报图片</h3>
                  <div className="image-grid">
                    {selectedReport.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={getImageUrl(img)}
                        alt={`图片${idx + 1}`}
                        className="review-image"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.recognition_results && selectedReport.recognition_results.length > 0 && (
                <div className="detail-section">
                  <h3>系统识别结果</h3>
                  {selectedReport.recognition_results.map((result, idx) => (
                    <div key={idx} className="recognition-result">
                      <div className="result-question">
                        <strong>问题：</strong>{result.question}
                      </div>
                      <div className="result-answer">
                        <strong>回答：</strong>{result.answer}
                      </div>
                      {result.event_type_detected && (
                        <div className="result-type">
                          <strong>检测到事件类型：</strong>{result.event_type_detected}
                        </div>
                      )}
                      {result.confidence && (
                        <div className="result-confidence">
                          <strong>置信度：</strong>
                          <span className={`confidence ${result.confidence > 0.7 ? 'high' : result.confidence > 0.5 ? 'medium' : 'low'}`}>
                            {(result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.status === 'pending' || selectedReport.status === 'manual_review' ? (
                <div className="detail-section">
                  <h3>审核操作</h3>
                  <div className="review-form">
                    <div className="form-group">
                      <label>审核结果 *</label>
                      <select
                        value={reviewResult}
                        onChange={(e) => setReviewResult(e.target.value)}
                      >
                        <option value="">请选择审核结果</option>
                        <option value="approved">通过</option>
                        <option value="rejected">驳回</option>
                        <option value="need_review">需复核</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>审核意见</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="请输入审核意见（可选）"
                        rows={4}
                      />
                    </div>
                    <button
                      className="submit-btn"
                      onClick={handleSubmitReview}
                      disabled={!reviewResult}
                    >
                      提交审核
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReview
