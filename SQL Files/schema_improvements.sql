-- =============================================================================
-- Schema Improvements for TaskManagementDB
-- Run AFTER databasemodel.sql and schema_updates.sql.
-- Fully idempotent — safe to run more than once.
-- =============================================================================

USE taskmanagementdb;

-- Turn off safe-update mode for the session so ALTERs aren't blocked
SET SQL_SAFE_UPDATES = 0;

DROP PROCEDURE IF EXISTS apply_improvements;

DELIMITER $$

CREATE PROCEDURE apply_improvements()
BEGIN

  -- ── 1. Widen User.email from VARCHAR(45) → VARCHAR(255) ──────────────────
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


  -- ── 2. Widen Attachment.fileSize from INT → BIGINT ───────────────────────
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


  -- ── 3. Default Task.priority to MEDIUM ───────────────────────────────────
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


  -- ── 4. Make Account.status NOT NULL with DEFAULT active ──────────────────
  IF (SELECT IS_NULLABLE
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = 'taskmanagementdb'
         AND TABLE_NAME   = 'Account'
         AND COLUMN_NAME  = 'status') = 'YES' THEN

    -- Backfill any existing NULLs before adding NOT NULL constraint
    UPDATE `Account` SET `status` = 'active' WHERE `status` IS NULL;

    ALTER TABLE `Account`
      MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active';
    SELECT '✔ Account.status set to NOT NULL DEFAULT active' AS result;
  ELSE
    SELECT '– Account.status already NOT NULL, skipped' AS result;
  END IF;


  -- ── 5. Rename "Device Table" → "Device" (table name contains a space) ────
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


  -- ── 6. Index: Reminder.dueDate ────────────────────────────────────────────
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


  -- ── 7. Index: Note(taskID, timestamp) ────────────────────────────────────
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


  -- ── 8. Index: Task.priority ───────────────────────────────────────────────
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


  -- ── 9. Index: TaskInstance.completionDateTime ─────────────────────────────
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


  -- ── 10. Index: Subtask(parentTaskID, statusID) ────────────────────────────
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

-- Run the procedure and then clean up
CALL apply_improvements();
DROP PROCEDURE IF EXISTS apply_improvements;
