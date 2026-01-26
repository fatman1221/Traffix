import axios from 'axios'
import { Message, ChatSession, User, Report, Ticket, RecognitionResult } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 设置token的辅助函数
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
    delete axios.defaults.headers.common['Authorization']
  }
}

// 从localStorage获取token
const token = localStorage.getItem('token')
if (token) {
  setAuthToken(token)
}

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

// ==================== 新增API：用户认证 ====================

export const register = async (username: string, phone: string, password: string, realName?: string) => {
  const formData = new FormData()
  formData.append('username', username)
  formData.append('phone', phone)
  formData.append('password', password)
  if (realName) formData.append('real_name', realName)
  
  const response = await axios.post('/api/auth/register', formData)
  if (response.data.access_token) {
    setAuthToken(response.data.access_token)
    localStorage.setItem('token', response.data.access_token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
  }
  return response.data
}

export const login = async (username: string, password: string) => {
  const formData = new FormData()
  formData.append('username', username)
  formData.append('password', password)
  
  const response = await axios.post('/api/auth/login', formData)
  if (response.data.access_token) {
    setAuthToken(response.data.access_token)
    localStorage.setItem('token', response.data.access_token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
  }
  return response.data
}

export const logout = () => {
  setAuthToken(null)
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/me')
  return response.data
}

// ==================== 新增API：事件上报 ====================

export const createReport = async (
  images: File[],
  eventType?: string,
  location?: string,
  description?: string,
  contactPhone?: string
): Promise<Report> => {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('未登录，请先登录')
  }
  
  const formData = new FormData()
  if (eventType) formData.append('event_type', eventType)
  if (location) formData.append('location', location)
  if (description) formData.append('description', description)
  if (contactPhone) formData.append('contact_phone', contactPhone)
  images.forEach(image => formData.append('images', image))
  
  const response = await axios.post('/api/reports', formData, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.data
}

export const getMyReports = async (): Promise<Report[]> => {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('未登录，请先登录')
  }
  const response = await api.get('/reports/my', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.data
}

// ==================== 新增API：模型识别 ====================

export const recognizeImage = async (image: File, question?: string): Promise<RecognitionResult> => {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('未登录，请先登录')
  }
  
  const formData = new FormData()
  formData.append('image', image)
  if (question) formData.append('question', question)
  
  const response = await axios.post('/api/recognize', formData, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.data
}

// ==================== 新增API：工单管理（管理端） ====================

export const getTickets = async (status?: string): Promise<Ticket[]> => {
  const url = status ? `/admin/tickets?status=${status}` : '/admin/tickets'
  const response = await api.get(url)
  return response.data
}

export const getTicketDetail = async (ticketId: number): Promise<any> => {
  const response = await api.get(`/admin/tickets/${ticketId}`)
  return response.data
}

export const reviewReport = async (reportId: number, reviewResult: string, reviewComment?: string) => {
  const formData = new FormData()
  formData.append('review_result', reviewResult)
  if (reviewComment) formData.append('review_comment', reviewComment)
  
  const response = await axios.post(`/api/admin/reports/${reportId}/review`, formData, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  return response.data
}

export const updateTicket = async (
  ticketId: number,
  status?: string,
  assignedTo?: number,
  priority?: string,
  comment?: string
) => {
  const formData = new FormData()
  if (status) formData.append('status', status)
  if (assignedTo) formData.append('assigned_to', assignedTo.toString())
  if (priority) formData.append('priority', priority)
  if (comment) formData.append('comment', comment)
  
  const response = await axios.post(`/api/admin/tickets/${ticketId}/update`, formData, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  return response.data
}

