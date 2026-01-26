# 地图功能接入指南

## 使用高德地图

### 1. 申请高德地图API Key

1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册/登录账号
3. 进入控制台，创建应用
4. 添加Key，选择"Web端(JS API)"
5. 获取API Key

### 2. 配置API Key

编辑 `frontend/src/components/MapPicker.tsx`，将 `YOUR_AMAP_API_KEY` 替换为你的API Key：

```typescript
const apiKey = 'YOUR_AMAP_API_KEY' // 替换为你的高德地图API Key
```

或者，更好的方式是通过环境变量配置：

1. 创建 `frontend/.env` 文件：
```env
VITE_AMAP_API_KEY=your_amap_api_key_here
```

2. 修改 `MapPicker.tsx`：
```typescript
const apiKey = import.meta.env.VITE_AMAP_API_KEY || 'YOUR_AMAP_API_KEY'
```

### 3. 功能说明

地图组件提供以下功能：
- ✅ 点击地图选择位置
- ✅ 自动逆地理编码获取地址
- ✅ 定位到当前位置
- ✅ 显示选中位置的地址
- ✅ 移动端适配

### 4. 数据库扩展（可选）

如果需要保存经纬度坐标，可以扩展数据库：

```sql
ALTER TABLE reports ADD COLUMN longitude DECIMAL(10, 6) NULL COMMENT '经度';
ALTER TABLE reports ADD COLUMN latitude DECIMAL(10, 6) NULL COMMENT '纬度';
```

然后修改后端API，保存经纬度信息。

### 5. 其他地图服务

如果不想使用高德地图，也可以使用：

- **百度地图**：https://lbsyun.baidu.com/
- **腾讯地图**：https://lbs.qq.com/
- **天地图**：https://www.tianditu.gov.cn/

只需要修改 `MapPicker.tsx` 中的地图加载逻辑即可。

### 6. 注意事项

- 高德地图个人开发者有免费额度，足够毕业设计使用
- API Key需要配置安全域名（开发环境可以使用localhost）
- 地图加载需要网络连接
- 移动端需要用户授权位置权限才能定位

