import React, { useState } from 'react'
import { createReport } from '../api'
import MapPicker from '../components/MapPicker'
import './PublicReport.css'

const PublicReport: React.FC = () => {
  const [images, setImages] = useState<File[]>([])
  const [eventType, setEventType] = useState('')
  const [location, setLocation] = useState('')
  const [locationCoords, setLocationCoords] = useState<{ lng: number; lat: number } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const eventTypes = ['车辆违停', '校门拥堵', '消防通道占用', '停车设施异常', '交通标识损坏', '其他']

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files)
      setImages([...images, ...newImages])
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (images.length === 0) {
      setMessage('请至少上传一张图片')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 如果有地图选中的位置，优先使用地图地址
      const finalLocation = location || ''
      const result = await createReport(images, eventType, finalLocation, description)
      setMessage(`提交成功！状态：${result.status === 'auto_approved' ? '自动通过' : result.status === 'manual_review' ? '待人工复核' : '待受理'}`)
      // 清空表单
      setImages([])
      setEventType('')
      setLocation('')
      setLocationCoords(null)
      setShowMap(false)
      setDescription('')
    } catch (err: any) {
      setMessage(err.response?.data?.detail || '提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-report-container">
      <div className="report-form-container">
        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-section">
            <label>上传图片 *（可多选）</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            {images.length > 0 && (
              <div className="image-preview">
                {images.map((img, index) => (
                  <div key={index} className="image-item">
                    <img src={URL.createObjectURL(img)} alt={`预览${index + 1}`} />
                    <button type="button" onClick={() => removeImage(index)}>删除</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <label>事件类型（校园交通/停车）</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="">请选择（可选，系统会自动识别）</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label>校内位置</label>
            <div className="location-input-group">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="请输入校门/道路/停车场等位置（可选）"
              />
              <button
                type="button"
                className="map-toggle-btn"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? '隐藏地图' : '地图选点'}
              </button>
            </div>
            {showMap && (
              <div style={{ marginTop: '10px' }}>
                <MapPicker
                  onLocationSelect={(loc) => {
                    setLocation(loc.address)
                    setLocationCoords({ lng: loc.lng, lat: loc.lat })
                  }}
                  initialLocation={locationCoords ? {
                    address: location,
                    lng: locationCoords.lng,
                    lat: locationCoords.lat
                  } : undefined}
                />
              </div>
            )}
          </div>

          <div className="form-section">
            <label>情况描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请描述拥堵、违停、占道或设施异常情况（可选）"
              rows={4}
            />
          </div>

          {message && (
            <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading || images.length === 0}>
            {loading ? '提交中...' : '提交事件'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PublicReport

