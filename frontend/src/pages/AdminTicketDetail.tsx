import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicketDetail, reviewReport, updateTicket, getDepartments } from '../api'
import {
  FALLBACK_DEPARTMENT_TREE,
  FALLBACK_QUICK_PRESETS,
} from '../data/departmentsFallback'
import { uploadPublicUrl } from '../utils/uploadUrl'
import './AdminTicketDetail.css'

type DeptNode = {
  code: string
  name: string
  children: Array<{ code: string; name: string }>
}

const AdminTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviewResult, setReviewResult] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [newPriority, setNewPriority] = useState('')
  const [comment, setComment] = useState('')
  const [deptTree, setDeptTree] = useState<DeptNode[]>([])
  const [quickPresets, setQuickPresets] = useState<
    Array<{ label: string; department_code: string; unit_code: string }>
  >([])
  const [deptCode, setDeptCode] = useState('')
  const [unitCode, setUnitCode] = useState('')
  const [deptApiError, setDeptApiError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getDepartments()
      .then((r) => {
        setDeptApiError(false)
        const tree = Array.isArray(r.tree) && r.tree.length > 0 ? r.tree : FALLBACK_DEPARTMENT_TREE
        const qp =
          Array.isArray(r.quick_presets) && r.quick_presets.length > 0
            ? r.quick_presets
            : FALLBACK_QUICK_PRESETS
        setDeptTree(tree)
        setQuickPresets(qp)
      })
      .catch(() => {
        setDeptTree(FALLBACK_DEPARTMENT_TREE)
        setQuickPresets(FALLBACK_QUICK_PRESETS)
        setDeptApiError(true)
      })
  }, [])

  useEffect(() => {
    if (ticketId) {
      loadTicketDetail()
    }
  }, [ticketId])

  const loadTicketDetail = async () => {
    try {
      const data = await getTicketDetail(Number(ticketId))
      setTicket(data)
      setNewStatus(data.status)
      setNewPriority(data.priority)
      setDeptCode(data.department_code || '')
      setUnitCode(data.unit_code || '')
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }

  const deptCodeValid = deptTree.some((d) => d.code === deptCode)
  const selectedDept = deptTree.find((d) => d.code === deptCode)
  const unitOptions = selectedDept?.children || []
  const unitCodeValid = unitOptions.some((c) => c.code === unitCode)

  const applySuggestedDept = async () => {
    if (!ticket?.event_type) {
      alert('工单无事件类型，无法推荐部门')
      return
    }
    try {
      const r = await getDepartments(ticket.event_type)
      if (r.suggested) {
        setDeptCode(r.suggested.department_code)
        setUnitCode(r.suggested.unit_code)
      } else {
        alert('暂无该类型的推荐指派')
      }
    } catch {
      alert('获取推荐失败')
    }
  }

  const handleReview = async () => {
    if (!ticket?.report?.id || !reviewResult) {
      alert('请选择审核结果')
      return
    }

    try {
      await reviewReport(ticket.report.id, reviewResult, reviewComment)
      alert('审核完成')
      loadTicketDetail()
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败')
    }
  }

  const handleUpdateTicket = async () => {
    if (!ticketId) return

    if (deptCode && !deptCodeValid) {
      alert('当前部门记录已失效，请从下拉列表重新选择部门。')
      return
    }
    if (deptCodeValid && !unitCodeValid) {
      alert('请选择指派处室，或清空部门后仅更新状态。')
      return
    }

    const d = deptTree.find((x) => x.code === deptCode)
    const u = d?.children.find((c) => c.code === unitCode)
    try {
      await updateTicket(Number(ticketId), newStatus, undefined, newPriority, comment, {
        assignedDepartment: d?.name ?? '',
        assignedUnit: u?.name ?? '',
        departmentCode: deptCode,
        unitCode: unitCode,
      })
      alert('更新成功')
      loadTicketDetail()
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败')
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!ticket) {
    return <div className="error">工单不存在</div>
  }

  return (
    <div className="ticket-detail-container">
      <div className="header">
        <h1>工单详情 - {ticket.ticket_no}</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/admin/tickets')}>返回列表</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h2>基本信息</h2>
          <div className="info-grid">
            <div><strong>工单编号：</strong>{ticket.ticket_no}</div>
            <div><strong>事件类型：</strong>{ticket.event_type || '未指定'}</div>
            <div><strong>地点：</strong>{ticket.location || '未指定'}</div>
            <div><strong>状态：</strong>{ticket.status}</div>
            <div><strong>优先级：</strong>{ticket.priority}</div>
            {(ticket.assigned_department || ticket.assigned_unit) && (
              <div>
                <strong>指派处置：</strong>
                {ticket.assigned_department || '-'}
                {ticket.assigned_unit ? ` · ${ticket.assigned_unit}` : ''}
              </div>
            )}
          </div>
        </div>

        {ticket.images && ticket.images.length > 0 && (
          <div className="detail-section">
            <h2>图片</h2>
            <div className="images-grid">
              {ticket.images.map((img: string, idx: number) => (
                <img key={idx} src={uploadPublicUrl(img)} alt={`图片${idx + 1}`} />
              ))}
            </div>
          </div>
        )}

        {ticket.recognition_results && ticket.recognition_results.length > 0 && (
          <div className="detail-section">
            <h2>模型识别结果</h2>
            {ticket.recognition_results.map((result: any, idx: number) => (
              <div key={idx} className="recognition-result">
                <div><strong>问题：</strong>{result.question}</div>
                <div><strong>回答：</strong>{result.answer}</div>
                {result.event_type_detected && (
                  <div><strong>检测到事件类型：</strong>{result.event_type_detected}</div>
                )}
                {result.confidence && (
                  <div><strong>置信度：</strong>{(result.confidence * 100).toFixed(2)}%</div>
                )}
              </div>
            ))}
          </div>
        )}

        {ticket.report && ticket.report.status === 'manual_review' && (
          <div className="detail-section">
            <h2>人工复核</h2>
            <div className="review-form">
              <select value={reviewResult} onChange={(e) => setReviewResult(e.target.value)}>
                <option value="">请选择审核结果</option>
                <option value="approved">通过</option>
                <option value="rejected">拒绝</option>
                <option value="need_review">需复核</option>
              </select>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="审核意见（可选）"
                rows={3}
              />
              <button onClick={handleReview}>提交审核</button>
            </div>
          </div>
        )}

        <div className="detail-section">
          <h2>更新工单</h2>
          <p className="dept-hint">审核调度员可将工单指派到具体部门与处室；保存时若仍为待处理且已选部门，状态将自动变为「已指派」。</p>
          {deptApiError && (
            <p className="dept-warn">
              无法从服务器加载部门列表，已使用本地默认部门数据；请检查网络或重新登录后刷新。
            </p>
          )}
          <div className="update-form">
            <div>
              <label>状态：</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="pending">待处理</option>
                <option value="assigned">已指派</option>
                <option value="processing">处理中</option>
                <option value="resolved">已解决</option>
                <option value="closed">已关闭</option>
              </select>
            </div>
            <div>
              <label>优先级：</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            {quickPresets.length > 0 && (
              <div className="dept-quick">
                <span className="dept-quick-label">常用指派（一键选）：</span>
                <div className="dept-quick-btns">
                  {quickPresets.map((q) => (
                    <button
                      key={`${q.department_code}-${q.unit_code}`}
                      type="button"
                      className="dept-chip"
                      onClick={() => {
                        setDeptCode(q.department_code)
                        setUnitCode(q.unit_code)
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="dept-row">
              <label>指派部门：</label>
              <select
                className="dept-select"
                value={deptCodeValid ? deptCode : ''}
                onChange={(e) => {
                  setDeptCode(e.target.value)
                  setUnitCode('')
                }}
              >
                <option value="">请选择部门（共 {deptTree.length} 类）</option>
                {deptCode && !deptCodeValid && (
                  <option value={deptCode}>（历史记录）{deptCode}</option>
                )}
                {deptTree.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="dept-row">
              <label>指派处室：</label>
              <select
                className="dept-select"
                value={deptCode && unitCodeValid ? unitCode : ''}
                onChange={(e) => setUnitCode(e.target.value)}
                disabled={!deptCodeValid}
              >
                <option value="">请选择处室</option>
                {unitCode && deptCodeValid && !unitCodeValid && (
                  <option value={unitCode}>（历史记录）{unitCode}</option>
                )}
                {unitOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" className="suggest-dept-btn" onClick={applySuggestedDept}>
                按事件类型推荐
              </button>
            </div>
            <div>
              <label>处理意见：</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="处理意见（可选）"
                rows={3}
              />
            </div>
            <button type="button" onClick={handleUpdateTicket}>
              更新工单
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminTicketDetail

