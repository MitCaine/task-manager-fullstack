-- =============================================================================
-- Schema Improvements for TaskManagementDB
-- Run AFTER databasemodel.sql and schema_updates.sql.
-- Fully idempotent — safe to run more than once.
-- =============================================================================

USE taskmanagementdb;

-- Schema maintenance statements in this script may update rows before ALTERs.
SET SQL_SAFE_UPDATES = 0;

DROP PROCEDURE IF EXISTS apply_improvements;

DELIMITER $$

CREATE PROCEDURE apply_improvements()
BEGIN

  -- 1. User.email needs enough room for standards-compliant addresses.
  --    RFC 5321 allows email addresses up to 254 characters.
  IF (SELECT CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = 'taskmanagementdb'
         AND TABLE_NAME   = 'User'
         AND COLUMN_NAME  = 'email') < 255 THEN

    ALTER TABLE `User`
      MODIFY COLUMN `email` VARCHAR(255) NOT NULL;
    SELECT '✔ User.email widened to VARCHAR(255)' AS result;
  ELSE
    SELECT '– User.email already VARCHAR(255), skipped' AS result;
  END IF;


  -- 2. Attachment.fileSize is stored as BIGINT for files larger than INT range.
  --    INT max is ~2 GB; modern files (videos, archives) exceed this.
  IF (SELECT DATA_TYPE
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = 'taskmanagementdb'
         AND TABLE_NAME   = 'Attachment'
         AND COLUMN_NAME  = 'fileSize') = 'int' THEN

    ALTER TABLE `Attachment`
      MODIFY COLUMN `fileSize` BIGINT NOT NULL;
    SELECT '✔ Attachment.fileSize changed to BIGINT' AS result;
  ELSE
    SELECT '– Attachment.fileSize already BIGINT, skipped' AS result;
  END IF;


  -- 3. Task.priority defaults to MEDIUM when callers omit it.
  IF (SELECT COLUMN_DEFAULT
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = 'taskmanagementdb'
         AND TABLE_NAME   = 'Task'
         AND COLUMN_NAME  = 'priority') IS NULL THEN

    ALTER TABLE `Task`
      ALTER COLUMN `priority` SET DEFAULT 'MEDIUM';
    SELECT '✔ Task.priority default set to MEDIUM' AS result;
  ELSE
    SELECT '– Task.priority default already set, skipped' AS result;
  END IF;


  -- 4. Account.status must always have an active/inactive value.
  IF (SELECT IS_NULLABLE
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = 'taskmanagementdb'
         AND TABLE_NAME   = 'Account'
         AND COLUMN_NAME  = 'status') = 'YES' THEN

    -- Existing NULL rows need a valid value before the NOT NULL constraint.
    UPDATE `Account` SET `status` = 'active' WHERE `status` IS NULL;

    ALTER TABLE `Account`
      MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active';
    SELECT '✔ Account.status set to NOT NULL DEFAULT active' AS result;
  ELSE
    SELECT '– Account.status already NOT NULL, skipped' AS result;
  END IF;


  -- 5. Device uses a query-friendly table name without spaces.
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = 'taskmanagementdb'
       AND TABLE_NAME   = 'Device Table'
  ) THEN
    RENAME TABLE `Device Table` TO `Device`;
    SELECT '✔ Renamed "Device Table" to "Device"' AS result;
  ELSE
    SELECT '– "Device Table" not found (already renamed or not yet created), skipped' AS result;
  END IF;


  -- 6. Reminder.dueDate supports due-reminder lookup.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'taskmanagementdb'
       AND TABLE_NAME   = 'Reminder'
       AND INDEX_NAME   = 'idx_Reminder_dueDate'
  ) THEN
    ALTER TABLE `Reminder`
      ADD INDEX `idx_Reminder_dueDate` (`dueDate` ASC);
    SELECT '✔ Created idx_Reminder_dueDate' AS result;
  ELSE
    SELECT '– idx_Reminder_dueDate already exists, skipped' AS result;
  END IF;


  -- 7. Note(taskID, timestamp) supports chronological notes per task.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'taskmanagementdb'
       AND TABLE_NAME   = 'Note'
       AND INDEX_NAME   = 'idx_Note_taskID_timestamp'
  ) THEN
    ALTER TABLE `Note`
      ADD INDEX `idx_Note_taskID_timestamp` (`taskID` ASC, `timestamp` ASC);
    SELECT '✔ Created idx_Note_taskID_timestamp' AS result;
  ELSE
    SELECT '– idx_Note_taskID_timestamp already exists, skipped' AS result;
  END IF;


  -- 8. Task.priority supports priority filtering.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'taskmanagementdb'
       AND TABLE_NAME   = 'Task'
       AND INDEX_NAME   = 'idx_Task_priority'
  ) THEN
    ALTER TABLE `Task`
      ADD INDEX `idx_Task_priority` (`priority` ASC);
    SELECT '✔ Created idx_Task_priority' AS result;
  ELSE
    SELECT '– idx_Task_priority already exists, skipped' AS result;
  END IF;


  -- 9. TaskInstance.completionDateTime supports completion history queries.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'taskmanagementdb'
       AND TABLE_NAME   = 'TaskInstance'
       AND INDEX_NAME   = 'idx_TaskInstance_completionDateTime'
  ) THEN
    ALTER TABLE `TaskInstance`
      ADD INDEX `idx_TaskInstance_completionDateTime` (`completionDateTime` ASC);
    SELECT '✔ Created idx_TaskInstance_completionDateTime' AS result;
  ELSE
    SELECT '– idx_TaskInstance_completionDateTime already exists, skipped' AS result;
  END IF;


  -- 10. Subtask(parentTaskID, statusID) supports task detail and completion queries.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'taskmanagementdb'
       AND TABLE_NAME   = 'Subtask'
       AND INDEX_NAME   = 'idx_Subtask_parentTaskID_statusID'
  ) THEN
    ALTER TABLE `Subtask`
      ADD INDEX `idx_Subtask_parentTaskID_statusID` (`parentTaskID` ASC, `statusID` ASC);
    SELECT '✔ Created idx_Subtask_parentTaskID_statusID' AS result;
  ELSE
    SELECT '– idx_Subtask_parentTaskID_statusID already exists, skipped' AS result;
  END IF;

END$$

DELIMITER ;

-- Apply the idempotent maintenance procedure, then remove it from the schema.
CALL apply_improvements();
DROP PROCEDURE IF EXISTS apply_improvements;
