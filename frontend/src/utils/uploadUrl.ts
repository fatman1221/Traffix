/**
 * 将库中存储路径（如 uploads/xxx.jpg）转为浏览器可请求的 URL。
 * 后端提供 GET /uploads/{filename}（无 /api 前缀），开发环境由 Vite 代理 /uploads。
 */
export function uploadPublicUrl(storedPath: string): string {
  if (!storedPath) return ''
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
    return storedPath
  }
  const normalized = storedPath.replace(/\\/g, '/')
  const basename = normalized.split('/').filter(Boolean).pop() || normalized
  return `/uploads/${basename}`
}
