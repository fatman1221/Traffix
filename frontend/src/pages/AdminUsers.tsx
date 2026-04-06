import React, { useState, useEffect, useRef } from 'react'
import { getUsers } from '../api'
import './AdminUsers.css'

interface User {
  id: number
  username: string
  phone: string
  role: 'public' | 'admin'
  real_name?: string
  created_at: string
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadUsers()
  }, [filterRole])

  useEffect(() => {
    // 防抖：用户停止输入500ms后再搜索
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      loadUsers()
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchKeyword])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers(
        filterRole || undefined,
        searchKeyword.trim() || undefined
      )
      setUsers(data)
      setLoading(false)
    } catch (error) {
      console.error('加载用户列表失败:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-users-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="admin-users-container">
      <div className="users-header">
        <h1>用户管理</h1>
        <div className="header-actions">
          <input
            type="text"
            placeholder="搜索用户名、手机号或姓名"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                loadUsers()
              }
            }}
            className="search-input"
          />
          {searchKeyword && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchKeyword('')}
            >
              清除
            </button>
          )}
        </div>
      </div>

      <div className="users-filters">
        <button
          className={filterRole === '' ? 'active' : ''}
          onClick={() => setFilterRole('')}
        >
          全部
        </button>
        <button
          className={filterRole === 'public' ? 'active' : ''}
          onClick={() => setFilterRole('public')}
        >
          公众用户
        </button>
        <button
          className={filterRole === 'admin' ? 'active' : ''}
          onClick={() => setFilterRole('admin')}
        >
          管理员
        </button>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>手机号</th>
              <th>姓名</th>
              <th>角色</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  {loading ? '加载中...' : '暂无用户'}
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.phone}</td>
                  <td>{user.real_name || '-'}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role === 'admin' ? '管理员' : '公众用户'}
                    </span>
                  </td>
                  <td>
                    {new Date(user.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td>
                    <button className="action-btn">查看</button>
                    <button className="action-btn danger">禁用</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="users-footer">
        <div className="users-count">
          共 {users.length} 个用户
        </div>
      </div>
    </div>
  )
}

export default AdminUsers

