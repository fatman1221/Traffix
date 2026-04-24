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

export const getTickets = async (status?: string, page: number = 1, pageSize: number = 10): Promise<{
  items: Ticket[]
  total: number
  page: number
  page_size: number
  total_pages: number
}> => {
  const params: any = { page, page_size: pageSize }
  if (status) {
    params.status = status
  }
  const response = await api.get('/admin/tickets', { params })
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

export type TicketDeptUpdate = {
  assignedDepartment?: string
  assignedUnit?: string
  departmentCode?: string
  unitCode?: string
}

export const updateTicket = async (
  ticketId: number,
  status?: string,
  assignedTo?: number,
  priority?: string,
  comment?: string,
  dept?: TicketDeptUpdate
) => {
  const formData = new FormData()
  if (status) formData.append('status', status)
  if (assignedTo !== undefined && assignedTo !== null) {
    formData.append('assigned_to', String(assignedTo))
  }
  if (priority) formData.append('priority', priority)
  if (comment) formData.append('comment', comment)
  if (dept?.assignedDepartment !== undefined) {
    formData.append('assigned_department', dept.assignedDepartment)
  }
  if (dept?.assignedUnit !== undefined) {
    formData.append('assigned_unit', dept.assignedUnit)
  }
  if (dept?.departmentCode !== undefined) {
    formData.append('department_code', dept.departmentCode)
  }
  if (dept?.unitCode !== undefined) {
    formData.append('unit_code', dept.unitCode)
  }

  const response = await axios.post(`/api/admin/tickets/${ticketId}/update`, formData, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  return response.data
}

// ==================== 新增API：统计数据 ====================

export const getStatistics = async (): Promise<any> => {
  const response = await api.get('/admin/statistics')
  return response.data
}

// ==================== 新增API：举报列表（支持分页和筛选） ====================

export const getReports = async (status?: string, page: number = 1, pageSize: number = 10): Promise<any> => {
  const params: any = { page, page_size: pageSize }
  if (status) {
    params.status = status
  }
  const response = await api.get('/admin/reports', { params })
  return response.data
}

export const getReportDetail = async (reportId: number): Promise<any> => {
  const response = await api.get(`/admin/reports/${reportId}`)
  return response.data
}

// ==================== 新增API：用户管理 ====================

export const getUsers = async (role?: string, keyword?: string): Promise<any[]> => {
  const params: any = {}
  if (role) params.role = role
  if (keyword) params.keyword = keyword
  const response = await api.get('/admin/users', { params })
  return response.data
}

export const createAdminUser = async (payload: {
  username: string
  phone: string
  password: string
  role: string
  real_name?: string
}) => {
  const fd = new FormData()
  fd.append('username', payload.username)
  fd.append('phone', payload.phone)
  fd.append('password', payload.password)
  fd.append('role', payload.role)
  if (payload.real_name) fd.append('real_name', payload.real_name)
  // 勿用带默认 Content-Type: application/json 的 api 实例提交 FormData，否则易出现 405/422
  const token = localStorage.getItem('token')
  const response = await axios.post('/api/admin/users', fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return response.data
}

export const updateUserRole = async (userId: number, role: string) => {
  const fd = new FormData()
  fd.append('role', role)
  const token = localStorage.getItem('token')
  const response = await axios.patch(`/api/admin/users/${userId}/role`, fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return response.data
}

export const getDepartments = async (eventType?: string) => {
  const params = eventType ? { event_type: eventType } : {}
  // 不用带默认 Content-Type: application/json 的 api 实例，避免个别环境下 GET 异常
  const token = localStorage.getItem('token')
  const response = await axios.get('/api/admin/departments', {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return response.data as {
    tree: Array<{ code: string; name: string; children: Array<{ code: string; name: string }> }>
    quick_presets?: Array<{
      label: string
      department_code: string
      unit_code: string
      department_name: string
      unit_name: string
    }>
    suggested: null | {
      department_code: string
      unit_code: string
      department_name: string
      unit_name: string
    }
  }
}

export const getCompletedTicketsAnalytics = async () => {
  const response = await api.get('/admin/analytics/completed-tickets')
  return response.data as {
    total_completed: number
    by_event_type: Array<{ event_type: string; count: number; ratio: number }>
    by_violation_category: Array<{ category: string; count: number; ratio: number }>
    by_location: Array<{ location: string; count: number; ratio: number }>
    accident_hotspots: Array<{ location: string; count: number; ratio: number }>
    by_department: Array<{ label: string; count: number }>
    suggestions: string[]
  }
}

// ==================== 新增API：数据管理 ====================

export const getDataItems = async (eventType?: string): Promise<any[]> => {
  const url = eventType ? `/admin/data?event_type=${eventType}` : '/admin/data'
  const response = await api.get(url)
  return response.data
}

export const saveDataLabel = async (dataId: number, label: string): Promise<any> => {
  const formData = new FormData()
  formData.append('label', label)
  
  const response = await axios.post(`/api/admin/data/${dataId}/label`, formData, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  return response.data
}

