import React from 'react'
import MessageItem from './MessageItem'
import { Message } from '../types'
import './MessageList.css'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, messagesEndRef }) => {
  return (
    <div className="message-list">
      {messages.length === 0 && !isLoading && (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>开始与智能体对话吧！</p>
          <p className="empty-hint">你可以发送文字消息或上传图片</p>
        </div>
      )}
      
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {isLoading && (
        <div className="loading-message">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList

