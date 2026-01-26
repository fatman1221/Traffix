import React, { useState, useEffect } from 'react'
import { getMyReports } from '../api'
import { Report } from '../types'
import './MyReports.css'

const MyReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const data = await getMyReports()
      setReports(data)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '待审核',
      'auto_approved': '自动通过',
      'auto_rejected': '自动拒绝',
      'manual_review': '待人工复核',
      'approved': '已通过',
      'rejected': '已拒绝',
      'closed': '已关闭'
    }
    return statusMap[status] || status
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="my-reports-container">

      <div className="reports-list">
        {reports.length === 0 ? (
          <div className="empty">暂无举报记录</div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="report-item">
              <div className="report-header">
                <span className="report-id">#{report.id}</span>
                <span className={`status status-${report.status}`}>
                  {getStatusText(report.status)}
                </span>
              </div>
              {report.event_type && (
                <div className="report-field">
                  <strong>事件类型：</strong>{report.event_type}
                </div>
              )}
              {report.location && (
                <div className="report-field">
                  <strong>地点：</strong>{report.location}
                </div>
              )}
              {report.description && (
                <div className="report-field">
                  <strong>描述：</strong>{report.description}
                </div>
              )}
              {report.images && report.images.length > 0 && (
                <div className="report-images">
                  {report.images.map((img, idx) => (
                    <img key={idx} src={`http://127.0.0.1:8000/uploads/${img.split('/').pop()}`} alt={`图片${idx + 1}`} />
                  ))}
                </div>
              )}
              <div className="report-time">
                {new Date(report.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MyReports

