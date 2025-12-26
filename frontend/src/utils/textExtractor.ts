/**
 * 从各种格式中提取纯文本内容
 * 处理可能的 JSON 字符串格式，如 "[{'text': '...'}]"
 */
export function extractTextFromContent(content: string | null | undefined): string {
  if (!content) {
    return ''
  }

  // 如果是字符串，尝试解析 JSON
  if (typeof content === 'string') {
    const trimmed = content.trim()
    
    // 检查是否是 JSON 格式的字符串（以 [ 或 { 开头）
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        // 尝试解析 JSON
        const parsed = JSON.parse(content)
        
        // 如果是列表
        if (Array.isArray(parsed)) {
          const textParts: string[] = []
          for (const item of parsed) {
            if (typeof item === 'object' && item !== null && item !== undefined) {
              // 检查是否有 text 字段
              if ('text' in item && item.text) {
                textParts.push(String(item.text))
              }
            } else if (typeof item === 'string') {
              textParts.push(item)
            }
          }
          const result = textParts.length > 0 ? textParts.join('\n') : content
          console.log('✅ 提取文本（列表）:', { 
            原始: content.substring(0, 100), 
            提取后: result.substring(0, 100),
            长度: result.length
          })
          return result
        }
        
        // 如果是对象
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          if ('text' in parsed && parsed.text) {
            const result = String(parsed.text)
            console.log('✅ 提取文本（对象）:', { 
              原始: content.substring(0, 100), 
              提取后: result.substring(0, 100) 
            })
            return result
          }
        }
      } catch (e) {
        // JSON 解析失败，可能是 Python 格式的字符串（使用单引号）
        // 尝试替换单引号为双引号再解析
        try {
          const fixedContent = content.replace(/'/g, '"')
          const parsed = JSON.parse(fixedContent)
          
          if (Array.isArray(parsed)) {
            const textParts: string[] = []
            for (const item of parsed) {
              if (typeof item === 'object' && item !== null && item !== undefined) {
                if ('text' in item && item.text) {
                  textParts.push(String(item.text))
                }
              } else if (typeof item === 'string') {
                textParts.push(item)
              }
            }
            const result = textParts.length > 0 ? textParts.join('\n') : content
            console.log('✅ 提取文本（Python格式列表）:', { 
              原始: content.substring(0, 100), 
              提取后: result.substring(0, 100) 
            })
            return result
          }
        } catch (e2) {
          // 所有解析都失败，返回原字符串
          console.warn('❌ JSON 解析失败:', e, '原始内容:', content.substring(0, 100))
          return content
        }
      }
    }
    
    // 不是 JSON 格式，直接返回
    return content
  }

  // 其他类型转换为字符串
  return String(content)
}

