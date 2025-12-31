import React, { useState, useEffect, useRef } from 'react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import HistoryPanel from './HistoryPanel'
import { Message, ChatSession } from '../types'
import { getChatSessions, createChatSession, getMessages, sendMessage } from '../api'
import './ChatInterface.css'

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    } else {
      setMessages([])
    }
  }, [currentSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSessions = async () => {
    try {
      const data = await getChatSessions()
      setSessions(data)
    } catch (error) {
      console.error('加载会话列表失败:', error)
    }
  }

  const loadMessages = async (sessionId: number) => {
    try {
      const data = await getMessages(sessionId)
      setMessages(data)
    } catch (error) {
      console.error('加载消息失败:', error)
    }
  }

  const handleNewSession = async () => {
    try {
      const session = await createChatSession()
      setSessions([session, ...sessions])
      setCurrentSessionId(session.id)
    } catch (error) {
      console.error('创建会话失败:', error)
    }
  }

  const handleSendMessage = async (content: string, image?: File) => {
    if (!content.trim() && !image) return

    let sessionId = currentSessionId
    if (!sessionId) {
      try {
        const session = await createChatSession()
        setSessions([session, ...sessions])
        sessionId = session.id
        setCurrentSessionId(sessionId)
      } catch (error) {
        console.error('创建会话失败:', error)
        return
      }
    }

    const userMessage: Message = {
      id: Date.now(),
      session_id: sessionId!,
      content,
      image_url: image ? URL.createObjectURL(image) : null,
      role: 'user',
      created_at: new Date().toISOString()
    }

    setMessages([...messages, userMessage])
    setIsLoading(true)

    try {
      const response = await sendMessage(sessionId!, content, image)
      const assistantMessage: Message = {
        id: response.id,
        session_id: sessionId!,
        content: response.content,
        image_url: null,
        role: 'assistant',
        created_at: response.created_at
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('发送消息失败:', error)
      // 尝试从响应中获取详细错误信息
      let errorContent = '抱歉，消息发送失败，请稍后重试。'
      if (error?.response?.data?.detail) {
        errorContent = `错误: ${error.response.data.detail}`
      } else if (error?.response?.data?.message) {
        errorContent = `错误: ${error.response.data.message}`
      } else if (error?.message) {
        errorContent = `错误: ${error.message}`
      }
      const errorMessage: Message = {
        id: Date.now() + 1,
        session_id: sessionId!,
        content: errorContent,
        image_url: null,
        role: 'assistant',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSession = (sessionId: number) => {
    setCurrentSessionId(sessionId)
    setShowHistory(false)
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>Traffix 智能体</h1>
        <button 
          className="history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? '隐藏历史' : '历史记录'}
        </button>
      </div>

      <div className="chat-container">
        {showHistory && (
          <HistoryPanel
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
          />
        )}

        <div className="chat-main">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
          <MessageInput 
            onSendMessage={handleSendMessage}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatInterface

