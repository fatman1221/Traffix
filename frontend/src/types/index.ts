export interface Message {
  id: number
  session_id: number
  content: string
  image_url: string | null
  role: 'user' | 'assistant'
  created_at: string
}

export interface ChatSession {
  id: number
  title: string | null
  created_at: string
  updated_at: string
}

// 新增类型
export interface User {
  id: number
  username: string
  phone: string
  role: 'public' | 'admin'
  real_name?: string
}

export interface Report {
  id: number
  event_type?: string
  location?: string
  description?: string
  status: 'pending' | 'auto_approved' | 'auto_rejected' | 'manual_review' | 'approved' | 'rejected' | 'closed'
  auto_review_result?: string
  images: string[]
  created_at: string
}

export interface Ticket {
  id: number
  ticket_no: string
  report_id: number
  event_type?: string
  location?: string
  description?: string
  status: 'pending' | 'assigned' | 'processing' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: number
  images: string[]
  created_at: string
  updated_at: string
}

export interface RecognitionResult {
  success: boolean
  question: string
  answer: string
  structured_data: any
  event_type?: string
  confidence: number
  image_url: string
}

