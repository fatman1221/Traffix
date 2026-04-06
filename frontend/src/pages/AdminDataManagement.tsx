import React, { useState, useEffect } from 'react'
import { getDataItems, saveDataLabel } from '../api'
import './AdminDataManagement.css'

interface DataItem {
  id: number
  image_url: string
  event_type?: string
  label?: string
  confidence?: number
  created_at: string
}

const AdminDataManagement: React.FC = () => {
  const [dataItems, setDataItems] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null)
  const [label, setLabel] = useState('')

  useEffect(() => {
    loadDataItems()
  }, [filterType])

  const loadDataItems = async () => {
    try {
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

  const filteredItems = dataItems.filter(item => {
    if (filterType && item.event_type !== filterType) return false
    return true
  })

  if (loading) {
    return (
      <div className="admin-data-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="admin-data-container">
      <div className="data-header">
        <h1>数据管理</h1>
        <div className="header-actions">
          <button className="upload-btn">上传数据</button>
        </div>
      </div>

      <div className="data-filters">
        <button
          className={filterType === '' ? 'active' : ''}
          onClick={() => setFilterType('')}
        >
          全部
        </button>
        <button
          className={filterType === '抛洒物' ? 'active' : ''}
          onClick={() => setFilterType('抛洒物')}
        >
          抛洒物
        </button>
        <button
          className={filterType === '交通事故' ? 'active' : ''}
          onClick={() => setFilterType('交通事故')}
        >
          交通事故
        </button>
        <button
          className={filterType === '道路损坏' ? 'active' : ''}
          onClick={() => setFilterType('道路损坏')}
        >
          道路损坏
        </button>
        <button
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
            filteredItems.map(item => (
              <div
                key={item.id}
                className={`data-item ${selectedItem?.id === item.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedItem(item)
                  setLabel(item.label || '')
                }}
              >
                <img
                  src={`/api/${item.image_url}`}
                  alt={`数据${item.id}`}
                  className="data-image"
                />
                <div className="data-info">
                  {item.label && (
                    <span className="data-label">{item.label}</span>
                  )}
                  {item.event_type && (
                    <span className="data-type">{item.event_type}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedItem && (
          <div className="data-detail">
            <div className="detail-header">
              <h3>数据标注</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedItem(null)}
              >
                ×
              </button>
            </div>
            <div className="detail-content">
              <img
                src={`/api/${selectedItem.image_url}`}
                alt="详情"
                className="detail-image"
              />
              <div className="label-form">
                <label>事件类型标签</label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                >
                  <option value="">请选择</option>
                  <option value="抛洒物">抛洒物</option>
                  <option value="交通事故">交通事故</option>
                  <option value="道路损坏">道路损坏</option>
                  <option value="车辆违停">车辆违停</option>
                  <option value="其他">其他</option>
                </select>
                <button
                  className="save-btn"
                  onClick={handleLabel}
                  disabled={!label}
                >
                  保存标签
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDataManagement

