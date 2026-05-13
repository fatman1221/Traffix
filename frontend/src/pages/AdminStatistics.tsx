import React, { useState, useEffect } from 'react'
import { getStatistics, getCompletedTicketsAnalytics } from '../api'
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
  const [completedAnalytics, setCompletedAnalytics] = useState({
    totalCompleted: 0,
    byLocation: [] as Array<{ location: string; count: number; ratio: number }>,
    byDepartment: [] as Array<{ label: string; count: number }>,
    suggestions: [] as string[],
  })

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    try {
      const data = await getStatistics()
      const completed = await getCompletedTicketsAnalytics()
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
      setCompletedAnalytics({
        totalCompleted: completed.total_completed || 0,
        byLocation: completed.by_location || [],
        byDepartment: completed.by_department || [],
        suggestions: completed.suggestions || [],
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
        <h1>学校交通与停车运营看板</h1>
      </div>

      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">总上报事件</div>
            <div className="stat-value">{stats.totalReports}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">总调度工单</div>
            <div className="stat-value">{stats.totalTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">待受理工单</div>
            <div className="stat-value">{stats.pendingTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">处置中工单</div>
            <div className="stat-value">{stats.processingTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">待验收工单</div>
            <div className="stat-value">{stats.resolvedTickets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">今日上报</div>
            <div className="stat-value">{stats.todayReports}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">已结案工单</div>
            <div className="stat-value">{completedAnalytics.totalCompleted}</div>
          </div>
        </div>
      </div>

      <div className="statistics-charts">
        <div className="chart-card">
          <h3>事件类型分布（校园交通）</h3>
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
          <h3>工单状态分布（调度闭环）</h3>
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

      <div className="statistics-charts">
        <div className="chart-card">
          <h3>高发点位（Top）</h3>
          <div className="chart-content">
            {completedAnalytics.byLocation.slice(0, 6).map((item) => (
              <div key={item.location} className="chart-item">
                <div className="chart-item-label">{item.location}</div>
                <div className="chart-item-bar">
                  <div className="chart-item-fill" style={{ width: `${Math.max(item.ratio * 100, 6)}%` }} />
                </div>
                <div className="chart-item-value">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <h3>部门处理分布</h3>
          <div className="chart-content">
            {completedAnalytics.byDepartment.slice(0, 6).map((item) => (
              <div key={item.label} className="chart-item">
                <div className="chart-item-label">{item.label}</div>
                <div className="chart-item-bar">
                  <div
                    className="chart-item-fill"
                    style={{
                      width: `${(item.count / Math.max(completedAnalytics.totalCompleted, 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="chart-item-value">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <h3>调度建议</h3>
        <div className="chart-content">
          {completedAnalytics.suggestions.slice(0, 4).map((item, idx) => (
            <div key={idx} className="suggestion-item">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminStatistics

