import React, { useState, useEffect } from 'react'
import { getStatistics } from '../api'
import './AdminStatistics.css'

const AdminStatistics: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalReports: 0,
    totalTickets: 0,
    pendingTickets: 0,
    processingTickets: 0,
    resolvedTickets: 0,
    todayReports: 0,
    todayTickets: 0,
    eventTypeStats: [] as Array<{ type: string; count: number }>,
    statusStats: [] as Array<{ status: string; count: number }>,
  })

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    try {
      const data = await getStatistics()
      setStats({
        totalReports: data.total_reports || 0,
        totalTickets: data.total_tickets || 0,
        pendingTickets: data.pending_tickets || 0,
        processingTickets: data.processing_tickets || 0,
        resolvedTickets: data.resolved_tickets || 0,
        todayReports: data.today_reports || 0,
        todayTickets: data.today_tickets || 0,
        eventTypeStats: (data.event_type_stats || []).map((item: any) => ({
          type: item.type,
          count: item.count
        })),
        statusStats: (data.status_stats || []).map((item: any) => ({
          status: item.status,
          count: item.count
        })),
      })
      setLoading(false)
    } catch (error) {
      console.error('加载统计数据失败:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-statistics-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="admin-statistics-container">
      <div className="statistics-header">
        <h1>数据统计</h1>
      </div>

      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">总举报数</div>
            <div className="stat-value">{stats.totalReports}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">总工单数</div>
            <div className="stat-value">{stats.totalTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">待处理工单</div>
            <div className="stat-value">{stats.pendingTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">处理中工单</div>
            <div className="stat-value">{stats.processingTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">已解决工单</div>
            <div className="stat-value">{stats.resolvedTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">今日举报</div>
            <div className="stat-value">{stats.todayReports}</div>
          </div>
        </div>
      </div>

      <div className="statistics-charts">
        <div className="chart-card">
          <h3>事件类型分布</h3>
          <div className="chart-content">
            {stats.eventTypeStats.map(item => (
              <div key={item.type} className="chart-item">
                <div className="chart-item-label">{item.type}</div>
                <div className="chart-item-bar">
                  <div
                    className="chart-item-fill"
                    style={{
                      width: `${(item.count / stats.totalReports) * 100}%`,
                    }}
                  />
                </div>
                <div className="chart-item-value">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>工单状态分布</h3>
          <div className="chart-content">
            {stats.statusStats.map(item => (
              <div key={item.status} className="chart-item">
                <div className="chart-item-label">{item.status}</div>
                <div className="chart-item-bar">
                  <div
                    className="chart-item-fill"
                    style={{
                      width: `${(item.count / stats.totalTickets) * 100}%`,
                    }}
                  />
                </div>
                <div className="chart-item-value">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminStatistics

