-- Migration: add missing columns, indexes and projects table safely
-- Usage: mysql -h HOST -u USER -p'PASSWORD' taskmanager < migrate_add_columns.sql

USE taskmanager;

-- Create projects table if it does not exist
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Helper: add column if not exists
-- due_date on tasks
SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE() AND table_name = 'tasks' AND column_name = 'due_date');
SET @sql = IF(@cnt = 0, 'ALTER TABLE tasks ADD COLUMN due_date DATETIME NULL', 'SELECT "due_date exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- priority on tasks
SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE() AND table_name = 'tasks' AND column_name = 'priority');
SET @sql = IF(@cnt = 0, "ALTER TABLE tasks ADD COLUMN priority ENUM('low','medium','high') DEFAULT 'medium'", 'SELECT "priority exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- project_id on tasks
SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE() AND table_name = 'tasks' AND column_name = 'project_id');
SET @sql = IF(@cnt = 0, 'ALTER TABLE tasks ADD COLUMN project_id INT NULL', 'SELECT "project_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- password_reset_token on users
SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_reset_token');
SET @sql = IF(@cnt = 0, 'ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) NULL', 'SELECT "password_reset_token exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- password_reset_expires on users
SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_reset_expires');
SET @sql = IF(@cnt = 0, 'ALTER TABLE users ADD COLUMN password_reset_expires DATETIME NULL', 'SELECT "password_reset_expires exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create indexes if not exist: due_date, priority, project_id on tasks
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'tasks' AND index_name = 'idx_tasks_due_date');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_tasks_due_date ON tasks(due_date)', 'SELECT "idx_tasks_due_date exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'tasks' AND index_name = 'idx_tasks_priority');
SET @sql = IF(@idx = 0, "CREATE INDEX idx_tasks_priority ON tasks(priority)", 'SELECT "idx_tasks_priority exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'tasks' AND index_name = 'idx_tasks_project_id');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_tasks_project_id ON tasks(project_id)', 'SELECT "idx_tasks_project_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Done
SELECT 'migration completed' as status;
