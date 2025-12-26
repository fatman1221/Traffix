import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message } from '../types'
import { extractTextFromContent } from '../utils/textExtractor'
import './MessageItem.css'

interface MessageItemProps {
  message: Message
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user'
  
  // 提取纯文本内容（处理可能的 JSON 格式）
  const displayContent = extractTextFromContent(message.content)
  
  // 调试日志
  if (message.content && message.content.trim().startsWith('[')) {
    console.log('处理消息内容:', {
      原始: message.content,
      提取后: displayContent,
      role: message.role
    })
  }
  
  return (
    <div className={`message-item ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-content">
        {message.image_url && (
          <div className="message-image">
            <img 
              src={message.image_url.startsWith('http') ? message.image_url : `http://localhost:8000${message.image_url}`} 
              alt="上传的图片" 
            />
          </div>
        )}
        {displayContent && (
          <div className="message-text">
            {isUser ? (
              // 用户消息直接显示文本，不渲染 Markdown
              <span>{displayContent}</span>
            ) : (
              // AI 消息使用 Markdown 渲染
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // 自定义样式
                  p: ({ children }) => <p className="markdown-p">{children}</p>,
                  h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
                  h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
                  h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
                  ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
                  ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
                  li: ({ children }) => <li className="markdown-li">{children}</li>,
                  code: ({ className, children, ...props }) => {
                    const isInline = !className
                    return isInline ? (
                      <code className="markdown-code-inline" {...props}>{children}</code>
                    ) : (
                      <code className="markdown-code-block" {...props}>{children}</code>
                    )
                  },
                  blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
                  strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
                  em: ({ children }) => <em className="markdown-em">{children}</em>,
                }}
              >
                {displayContent}
              </ReactMarkdown>
            )}
          </div>
        )}
        <div className="message-time">
          {new Date(message.created_at).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })}
        </div>
      </div>
    </div>
  )
}

export default MessageItem

