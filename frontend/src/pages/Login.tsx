import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api'
import './Login.css'

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [realName, setRealName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(username, password)
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (user.role === 'admin') {
          navigate('/admin/tickets')
        } else {
          navigate('/public')
        }
      } else {
        if (!phone) {
          setError('请输入手机号')
          setLoading(false)
          return
        }
        await register(username, phone, password, realName)
        navigate('/public')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>交通事件感知系统</h1>
        <div className="login-tabs">
          <button
            className={isLogin ? 'active' : ''}
            onClick={() => setIsLogin(true)}
          >
            登录
          </button>
          <button
            className={!isLogin ? 'active' : ''}
            onClick={() => setIsLogin(false)}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="请输入用户名"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>手机号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="请输入手机号"
                />
              </div>
              <div className="form-group">
                <label>真实姓名（可选）</label>
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="请输入真实姓名"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="请输入密码"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="login-footer">
          <p>提示：管理员账户请联系系统管理员获取</p>
        </div>
      </div>
    </div>
  )
}

export default Login

