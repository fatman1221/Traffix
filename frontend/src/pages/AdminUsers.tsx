import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, createAdminUser, updateUserRole } from '../api'
import './AdminUsers.css'

interface UserRow {
  id: number
  username: string
  phone: string
  role: string
  real_name?: string
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  public: '公众用户',
  admin: '管理员',
  dispatcher: '审核调度员',
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    username: '',
    phone: '',
    password: '',
    role: 'dispatcher',
    real_name: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (u.role !== 'admin') {
      navigate('/admin/statistics', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    loadUsers()
  }, [filterRole])

  useEffect(() => {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.username || !createForm.phone || !createForm.password) {
      alert('请填写用户名、手机号和密码')
      return
    }
    try {
      setCreating(true)
      await createAdminUser(createForm)
      setShowCreate(false)
      setCreateForm({
        username: '',
        phone: '',
        password: '',
        role: 'dispatcher',
        real_name: '',
      })
      loadUsers()
      alert('创建成功')
    } catch (err: any) {
      alert(err.response?.data?.detail || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (userId: number, role: string) => {
    if (!window.confirm(`确认将该用户角色改为「${ROLE_LABEL[role] || role}」？`)) return
    try {
      await updateUserRole(userId, role)
      loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.detail || '修改失败')
    }
  }

  if (loading && users.length === 0) {
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
          <button type="button" className="create-user-btn" onClick={() => setShowCreate(true)}>
            新建用户
          </button>
          <input
            type="text"
            placeholder="搜索用户名、手机号或姓名"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadUsers()
            }}
            className="search-input"
          />
          {searchKeyword && (
            <button className="clear-search-btn" type="button" onClick={() => setSearchKeyword('')}>
              清除
            </button>
          )}
        </div>
      </div>

      <div className="users-filters">
        <button
          type="button"
          className={filterRole === '' ? 'active' : ''}
          onClick={() => setFilterRole('')}
        >
          全部
        </button>
        <button
          type="button"
          className={filterRole === 'public' ? 'active' : ''}
          onClick={() => setFilterRole('public')}
        >
          公众用户
        </button>
        <button
          type="button"
          className={filterRole === 'dispatcher' ? 'active' : ''}
          onClick={() => setFilterRole('dispatcher')}
        >
          审核调度员
        </button>
        <button
          type="button"
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
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.phone}</td>
                  <td>{user.real_name || '-'}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {ROLE_LABEL[user.role] || user.role}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleString('zh-CN')}</td>
                  <td>
                    <select
                      className="role-select"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      title="修改角色"
                    >
                      <option value="public">公众用户</option>
                      <option value="dispatcher">审核调度员</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="users-footer">
        <div className="users-count">共 {users.length} 个用户</div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2>新建用户</h2>
            <form onSubmit={handleCreate}>
              <label>
                用户名
                <input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                />
              </label>
              <label>
                手机号
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  required
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
              </label>
              <label>
                姓名
                <input
                  value={createForm.real_name}
                  onChange={(e) => setCreateForm({ ...createForm, real_name: e.target.value })}
                />
              </label>
              <label>
                角色
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                >
                  <option value="dispatcher">审核调度员</option>
                  <option value="admin">管理员</option>
                  <option value="public">公众用户</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-muted" onClick={() => setShowCreate(false)} disabled={creating}>
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? '提交中…' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
