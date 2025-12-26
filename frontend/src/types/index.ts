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

