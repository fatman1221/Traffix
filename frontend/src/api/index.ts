import axios from 'axios'
import { Message, ChatSession } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const getChatSessions = async (): Promise<ChatSession[]> => {
  const response = await api.get('/sessions')
  return response.data
}

export const createChatSession = async (): Promise<ChatSession> => {
  const response = await api.post('/sessions')
  return response.data
}

export const getMessages = async (sessionId: number): Promise<Message[]> => {
  const response = await api.get(`/sessions/${sessionId}/messages`)
  return response.data
}

export const sendMessage = async (
  sessionId: number,
  content: string,
  image?: File
): Promise<Message> => {
  const formData = new FormData()
  formData.append('content', content)
  if (image) {
    formData.append('image', image)
  }

  // 对于 FormData，使用单独的 axios 实例，不设置 Content-Type，让浏览器自动设置（包含 boundary）
  const response = await axios.post(
    `/api/sessions/${sessionId}/messages`,
    formData,
    {
      headers: {
        // 不设置 Content-Type，让浏览器自动设置 multipart/form-data 和 boundary
      }
    }
  )
  return response.data
}

