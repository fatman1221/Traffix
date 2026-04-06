-- Traffix 扩展：角色 dispatcher、工单指派部门字段
-- 在 MySQL 上执行（请按需备份后运行）

-- 若 users.role 原为 ENUM，改为 VARCHAR 以支持 dispatcher
ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'public';

ALTER TABLE tickets
  ADD COLUMN assigned_department VARCHAR(200) NULL COMMENT '指派部门名称' AFTER assigned_to,
  ADD COLUMN assigned_unit VARCHAR(200) NULL COMMENT '指派处室名称' AFTER assigned_department,
  ADD COLUMN department_code VARCHAR(64) NULL AFTER assigned_unit,
  ADD COLUMN unit_code VARCHAR(64) NULL AFTER department_code;
