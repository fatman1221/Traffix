import React, { useState, useRef } from 'react'
import './MessageInput.css'

interface MessageInputProps {
  onSendMessage: (content: string, image?: File) => void
  disabled: boolean
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled }) => {
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim() || image) {
      onSendMessage(content, image || undefined)
      setContent('')
      setImage(null)
      setImagePreview(null)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过 5MB')
        return
      }
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="message-input-container">
      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="预览" />
          <button 
            className="remove-image"
            onClick={handleRemoveImage}
            type="button"
          >
            ×
          </button>
        </div>
      )}
      
      <form className="message-input-form" onSubmit={handleSubmit}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className="file-input"
          id="image-input"
          disabled={disabled}
        />
        <label
          htmlFor="image-input"
          className="image-button attach-add"
          title="添加图片"
          aria-label="添加图片"
        >
          <span className="attach-add-icon" aria-hidden>
            +
          </span>
        </label>
        
        <textarea
          className="message-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入消息..."
          rows={1}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        
        <button
          type="submit"
          className="send-button"
          disabled={disabled || (!content.trim() && !image)}
        >
          发送
        </button>
      </form>
    </div>
  )
}

export default MessageInput

