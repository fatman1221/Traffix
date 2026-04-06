/**
 * 与 backend/departments.py 保持一致的兜底数据。
 * 当 /api/admin/departments 失败或返回空时，仍可在工单页选择部门。
 */
export type DeptChild = { code: string; name: string }
export type DeptNode = { code: string; name: string; children: DeptChild[] }

export const FALLBACK_DEPARTMENT_TREE: DeptNode[] = [
  {
    code: 'traffic_police',
    name: '交警部门',
    children: [
      { code: 'traffic_order', name: '秩序科' },
      { code: 'traffic_accident', name: '事故处理中队' },
      { code: 'traffic_patrol', name: '勤务中队' },
      { code: 'traffic_command', name: '交通指挥中心' },
      { code: 'traffic_legal', name: '法制科' },
    ],
  },
  {
    code: 'municipal',
    name: '市政部门',
    children: [
      { code: 'municipal_engineering', name: '工程管理处' },
      { code: 'municipal_road', name: '道路养护中心' },
      { code: 'municipal_facility', name: '市政设施管理处' },
      { code: 'municipal_drain', name: '排水管理处' },
      { code: 'municipal_lighting', name: '城市照明管理所' },
    ],
  },
  {
    code: 'urban_mgmt',
    name: '城管部门',
    children: [
      { code: 'urban_env', name: '市容环境执法大队' },
      { code: 'urban_parking', name: '静态交通管理办' },
      { code: 'urban_illegal', name: '违建查处大队' },
      { code: 'urban_garden', name: '园林绿化科' },
    ],
  },
  {
    code: 'transport',
    name: '交通运输部门',
    children: [
      { code: 'transport_highway', name: '公路事业发展中心' },
      { code: 'transport_road', name: '道路运输服务中心' },
      { code: 'transport_enforce', name: '交通综合执法支队' },
    ],
  },
  {
    code: 'emergency',
    name: '应急管理部门',
    children: [
      { code: 'emergency_rescue', name: '应急救援中心' },
      { code: 'emergency_coord', name: '应急协调科' },
      { code: 'emergency_flood', name: '防汛抗旱指挥部值班室' },
    ],
  },
  {
    code: 'fire_rescue',
    name: '消防救援',
    children: [
      { code: 'fire_command', name: '119 指挥中心' },
      { code: 'fire_station', name: '辖区消防救援站' },
    ],
  },
  {
    code: 'health',
    name: '医疗卫生',
    children: [
      { code: 'health_emergency', name: '120 急救中心' },
      { code: 'health_hospital', name: '定点医院联络办' },
    ],
  },
  {
    code: 'street',
    name: '属地街道办 / 乡镇',
    children: [
      { code: 'street_admin', name: '综合管理办公室' },
      { code: 'street_grid', name: '网格化服务管理中心' },
      { code: 'street_safety', name: '平安建设办' },
    ],
  },
  {
    code: 'highway_ops',
    name: '高速公路运营单位',
    children: [
      { code: 'hw_patrol', name: '路产管理部 / 巡查' },
      { code: 'hw_rescue', name: '清障救援调度' },
    ],
  },
  {
    code: 'other',
    name: '其他协同单位',
    children: [
      { code: 'other_contact', name: '综合联络组' },
      { code: 'other_temp', name: '临时协调专班' },
    ],
  },
]

export const FALLBACK_QUICK_PRESETS: Array<{
  label: string
  department_code: string
  unit_code: string
}> = [
  { label: '交警 · 事故处理', department_code: 'traffic_police', unit_code: 'traffic_accident' },
  { label: '市政 · 工程管理', department_code: 'municipal', unit_code: 'municipal_engineering' },
  { label: '市政 · 道路养护', department_code: 'municipal', unit_code: 'municipal_road' },
  { label: '城管 · 市容环境', department_code: 'urban_mgmt', unit_code: 'urban_env' },
  { label: '城管 · 违停治理', department_code: 'urban_mgmt', unit_code: 'urban_parking' },
  { label: '交通 · 公路事业', department_code: 'transport', unit_code: 'transport_highway' },
  { label: '应急 · 救援', department_code: 'emergency', unit_code: 'emergency_rescue' },
  { label: '消防', department_code: 'fire_rescue', unit_code: 'fire_command' },
  { label: '街道办 · 综合办', department_code: 'street', unit_code: 'street_admin' },
  { label: '高速 · 路产', department_code: 'highway_ops', unit_code: 'hw_patrol' },
]
