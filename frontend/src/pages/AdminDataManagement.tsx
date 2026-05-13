import React, { useEffect, useMemo, useState } from 'react'
import { getDataItems } from '../api'
import { uploadPublicUrl } from '../utils/uploadUrl'
import './AdminDataManagement.css'

interface DetectionItem {
  model?: string
  event_type?: string
  class_name?: string
  confidence?: number
  box?: number[]
}

interface DataItem {
  id: number
  report_id?: number
  image_url: string
  event_type?: string
  label?: string
  confidence?: number
  model_event_type?: string
  model_answer?: string
  model_structured_data?: {
    provider?: string
    models?: string[]
    detections?: DetectionItem[]
  } | string | null
  model_created_at?: string
  created_at: string
}

const EVENT_FILTERS = ['抛洒物', '交通事故', '道路损坏', '车辆违停', '其他']

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatConfidence = (value?: number | null) => {
  if (value === undefined || value === null) return '-'
  return `${Math.round(value * 100)}%`
}

const parseStructuredData = (value: DataItem['model_structured_data']) => {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Exclude<DataItem['model_structured_data'], string | null>
    } catch {
      return null
    }
  }
  return value
}

const AdminDataManagement: React.FC = () => {
  const [dataItems, setDataItems] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null)

  useEffect(() => {
    loadDataItems()
  }, [filterType])

  useEffect(() => {
    if (!selectedItem && dataItems.length > 0) {
      setSelectedItem(dataItems[0])
    }
  }, [dataItems, selectedItem])

  const loadDataItems = async () => {
    try {
      setLoading(true)
      const data = await getDataItems(filterType || undefined)
      setDataItems(data)
    } catch (error) {
      console.error('加载数据失败:', error)
      setDataItems([])
    } finally {
      setLoading(false)
    }
  }

  const selectedStructured = useMemo(
    () => parseStructuredData(selectedItem?.model_structured_data),
    [selectedItem]
  )

  const detections = selectedStructured?.detections || []
  const rawStructuredMetadata = useMemo(() => {
    const value = selectedStructured || selectedItem?.model_structured_data || null
    if (!value) return 'null'
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }, [selectedItem, selectedStructured])

  return (
    <div className="admin-data-container">
      <div className="data-header">
        <div>
          <h1>数据管理</h1>
          <p>集中查看图片上传后的模型识别结果与置信度。</p>
        </div>
      </div>

      <div className="data-filters">
        <button
          type="button"
          className={filterType === '' ? 'active' : ''}
          onClick={() => setFilterType('')}
        >
          全部
        </button>
        {EVENT_FILTERS.map((type) => (
          <button
            key={type}
            type="button"
            className={filterType === type ? 'active' : ''}
            onClick={() => setFilterType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="model-results-layout">
          <section className="model-results-list" aria-label="模型返回结果列表">
            {dataItems.length === 0 ? (
              <div className="empty">暂无模型识别结果</div>
            ) : (
              dataItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`result-row ${selectedItem?.id === item.id ? 'active' : ''}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <img src={uploadPublicUrl(item.image_url)} alt={`识别图片${item.id}`} />
                  <span className="result-main">
                    <span className="result-title">
                      {item.model_event_type || item.event_type || '未识别'}
                    </span>
                    <span className="result-answer">
                      {item.model_answer || '模型暂未返回文字结果'}
                    </span>
                  </span>
                  <span className="result-meta">
                    <span>{formatConfidence(item.confidence)}</span>
                    <span>{formatDate(item.model_created_at || item.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </section>

          <aside className="model-result-detail">
            {selectedItem ? (
              <>
                <div className="detail-heading">
                  <h2>{selectedItem.model_event_type || selectedItem.event_type || '未识别'}</h2>
                  <span>{formatConfidence(selectedItem.confidence)}</span>
                </div>

                <img
                  src={uploadPublicUrl(selectedItem.image_url)}
                  alt="模型识别详情"
                  className="detail-image"
                />

                <div className="result-summary">
                  <div>
                    <span>模型来源</span>
                    <strong>{selectedStructured?.provider || '未记录'}</strong>
                  </div>
                  <div>
                    <span>使用模型</span>
                    <strong>{selectedStructured?.models?.join('、') || '未记录'}</strong>
                  </div>
                  <div>
                    <span>上报类型</span>
                    <strong>{selectedItem.event_type || '-'}</strong>
                  </div>
                  <div>
                    <span>识别时间</span>
                    <strong>{formatDate(selectedItem.model_created_at || selectedItem.created_at)}</strong>
                  </div>
                </div>

                <section className="answer-section">
                  <h3>模型返回结果</h3>
                  <p>{selectedItem.model_answer || '暂无返回内容'}</p>
                </section>

                <section className="answer-section">
                  <h3>检测目标列表</h3>
                  {detections.length === 0 ? (
                    <p className="muted">暂无检测框数据</p>
                  ) : (
                    <ul className="detection-list">
                      {detections.map((item, index) => (
                        <li key={`${item.model || 'model'}-${index}`}>
                          <span>
                            {item.event_type || item.class_name || '目标'}
                            {item.model ? ` · ${item.model}` : ''}
                          </span>
                          <strong>{formatConfidence(item.confidence)}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <details className="metadata-details">
                  <summary>模型返回元数据</summary>
                  <pre>{rawStructuredMetadata}</pre>
                </details>
              </>
            ) : (
              <div className="empty detail-empty">请选择一条模型结果</div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

export default AdminDataManagement
