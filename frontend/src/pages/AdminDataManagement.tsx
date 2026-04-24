import React, { useState, useEffect } from 'react'
import { getDataItems, saveDataLabel, getCompletedTicketsAnalytics } from '../api'
import { uploadPublicUrl } from '../utils/uploadUrl'
import './AdminDataManagement.css'

interface DataItem {
  id: number
  image_url: string
  event_type?: string
  label?: string
  confidence?: number
  created_at: string
}

type Analytics = Awaited<ReturnType<typeof getCompletedTicketsAnalytics>>

const AdminDataManagement: React.FC = () => {
  const [mainTab, setMainTab] = useState<'samples' | 'analytics'>('samples')
  const [dataItems, setDataItems] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null)
  const [label, setLabel] = useState('')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    if (mainTab !== 'samples') return
    loadDataItems()
  }, [filterType, mainTab])

  useEffect(() => {
    if (mainTab !== 'analytics') return
    let cancelled = false
    setAnalyticsLoading(true)
    getCompletedTicketsAnalytics()
      .then((data) => {
        if (!cancelled) setAnalytics(data)
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null)
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mainTab])

  const loadDataItems = async () => {
    try {
      setLoading(true)
      const data = await getDataItems(filterType || undefined)
      setDataItems(data)
      setLoading(false)
    } catch (error) {
      console.error('加载数据失败:', error)
      setLoading(false)
    }
  }

  const handleLabel = async () => {
    if (!selectedItem || !label) {
      alert('请选择数据项并输入标签')
      return
    }

    try {
      await saveDataLabel(selectedItem.id, label)
      alert('标签保存成功')
      setSelectedItem(null)
      setLabel('')
      loadDataItems()
    } catch (error: any) {
      alert(error.response?.data?.detail || '保存失败')
    }
  }

  const filteredItems = dataItems.filter((item) => {
    if (filterType && item.event_type !== filterType) return false
    return true
  })

  return (
    <div className="admin-data-container">
      <div className="data-header">
        <h1>数据管理</h1>
        <div className="header-actions">
          <button type="button" className="upload-btn" disabled title="占位">
            上传数据
          </button>
        </div>
      </div>

      <div className="data-main-tabs">
        <button
          type="button"
          className={mainTab === 'samples' ? 'active' : ''}
          onClick={() => setMainTab('samples')}
        >
          样本标注
        </button>
        <button
          type="button"
          className={mainTab === 'analytics' ? 'active' : ''}
          onClick={() => setMainTab('analytics')}
        >
          结案分析
        </button>
      </div>

      {mainTab === 'analytics' ? (
        <div className="analytics-wrap">
          {analyticsLoading && <div className="loading">分析数据加载中...</div>}
          {!analyticsLoading && analytics && (
            <>
              <div className="analytics-summary">
                已结案工单（已解决 / 已关闭）共 <strong>{analytics.total_completed}</strong> 起
              </div>

              <div className="analytics-grid">
                <section className="analytics-card">
                  <h3>事件类型分布</h3>
                  <p className="card-desc">反映主要「违规/事件」类别占比</p>
                  {analytics.by_event_type.length === 0 ? (
                    <p className="muted">暂无数据</p>
                  ) : (
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>类型</th>
                          <th>件数</th>
                          <th>占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.by_event_type.map((row) => (
                          <tr key={row.event_type}>
                            <td>{row.event_type}</td>
                            <td>{row.count}</td>
                            <td>{(row.ratio * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="analytics-card">
                  <h3>违规类型细分</h3>
                  <p className="card-desc">基于工单类型与描述识别具体违规类别</p>
                  {analytics.by_violation_category.length === 0 ? (
                    <p className="muted">暂无数据</p>
                  ) : (
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>违规类别</th>
                          <th>件数</th>
                          <th>占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.by_violation_category.map((row) => (
                          <tr key={row.category}>
                            <td>{row.category}</td>
                            <td>{row.count}</td>
                            <td>{(row.ratio * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="analytics-card">
                  <h3>高发路段 TOP</h3>
                  <p className="card-desc">按上报地点聚合，辅助识别事故多发段</p>
                  {analytics.by_location.length === 0 ? (
                    <p className="muted">暂无数据</p>
                  ) : (
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>路段/位置</th>
                          <th>件数</th>
                          <th>占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.by_location.map((row) => (
                          <tr key={row.location}>
                            <td className="loc-cell">{row.location}</td>
                            <td>{row.count}</td>
                            <td>{(row.ratio * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="analytics-card">
                  <h3>事故高发路段</h3>
                  <p className="card-desc">筛选事故类工单，聚焦重点路段</p>
                  {analytics.accident_hotspots.length === 0 ? (
                    <p className="muted">暂无事故高发数据</p>
                  ) : (
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>路段/位置</th>
                          <th>事故件数</th>
                          <th>占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.accident_hotspots.map((row) => (
                          <tr key={row.location}>
                            <td className="loc-cell">{row.location}</td>
                            <td>{row.count}</td>
                            <td>{(row.ratio * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="analytics-card">
                  <h3>指派部门分布</h3>
                  <p className="card-desc">结案工单对应的处置部门记录</p>
                  {analytics.by_department.length === 0 ? (
                    <p className="muted">暂无数据</p>
                  ) : (
                    <ul className="dept-list">
                      {analytics.by_department.map((row) => (
                        <li key={row.label}>
                          <span>{row.label}</span>
                          <span className="cnt">{row.count} 起</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="analytics-suggestions">
                <h3>分析与建议</h3>
                <ul>
                  {analytics.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      ) : loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <div className="data-filters">
            <button
              type="button"
              className={filterType === '' ? 'active' : ''}
              onClick={() => setFilterType('')}
            >
              全部
            </button>
            <button
              type="button"
              className={filterType === '抛洒物' ? 'active' : ''}
              onClick={() => setFilterType('抛洒物')}
            >
              抛洒物
            </button>
            <button
              type="button"
              className={filterType === '交通事故' ? 'active' : ''}
              onClick={() => setFilterType('交通事故')}
            >
              交通事故
            </button>
            <button
              type="button"
              className={filterType === '道路损坏' ? 'active' : ''}
              onClick={() => setFilterType('道路损坏')}
            >
              道路损坏
            </button>
            <button
              type="button"
              className={filterType === '车辆违停' ? 'active' : ''}
              onClick={() => setFilterType('车辆违停')}
            >
              车辆违停
            </button>
          </div>

          <div className="data-content">
            <div className="data-grid">
              {filteredItems.length === 0 ? (
                <div className="empty">暂无数据</div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`data-item ${selectedItem?.id === item.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedItem(item)
                      setLabel(item.label || '')
                    }}
                  >
                    <img
                      src={uploadPublicUrl(item.image_url)}
                      alt={`数据${item.id}`}
                      className="data-image"
                    />
                    <div className="data-info">
                      {item.label && <span className="data-label">{item.label}</span>}
                      {item.event_type && <span className="data-type">{item.event_type}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedItem && (
              <div className="data-detail">
                <div className="detail-header">
                  <h3>数据标注</h3>
                  <button type="button" className="close-btn" onClick={() => setSelectedItem(null)}>
                    ×
                  </button>
                </div>
                <div className="detail-content">
                  <img
                    src={uploadPublicUrl(selectedItem.image_url)}
                    alt="详情"
                    className="detail-image"
                  />
                  <div className="label-form">
                    <label>事件类型标签</label>
                    <select value={label} onChange={(e) => setLabel(e.target.value)}>
                      <option value="">请选择</option>
                      <option value="抛洒物">抛洒物</option>
                      <option value="交通事故">交通事故</option>
                      <option value="道路损坏">道路损坏</option>
                      <option value="车辆违停">车辆违停</option>
                      <option value="其他">其他</option>
                    </select>
                    <button type="button" className="save-btn" onClick={handleLabel} disabled={!label}>
                      保存标签
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDataManagement
