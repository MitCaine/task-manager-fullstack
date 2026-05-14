-- =============================================================================
-- Schema Updates for TaskManagementDB
-- Apply these ALTER statements to an existing database.
-- =============================================================================

USE taskmanagementdb;

-- -----------------------------------------------------------------------------
-- 1. User.userID should be database-assigned for API-created users.
-- -----------------------------------------------------------------------------
ALTER TABLE `User`
  MODIFY `userID` INT NOT NULL AUTO_INCREMENT;


-- -----------------------------------------------------------------------------
-- 2. Placeholder columns are not part of the domain model and block clean inserts.
-- -----------------------------------------------------------------------------
ALTER TABLE `Tag`        DROP COLUMN `Tagcol`;
ALTER TABLE `Subtask`    DROP COLUMN `Subtaskcol`;
ALTER TABLE `Attachment` DROP COLUMN `Attachmentcol`;


-- -----------------------------------------------------------------------------
-- 3. Recurrence rules are independent records referenced by tasks.
--
--    Existing schema state:
--      RecurrenceRule.taskID  → Task.taskID   (FK enforced)
--      Task.recurrenceRuleID  → (nothing)      (column exists, no constraint)
--
--    Target relationship: a Task optionally follows a RecurrenceRule.
--    RecurrenceRule should be an independent entity; Task references it.
--
--    This block moves ownership to Task.recurrenceRuleID.
-- -----------------------------------------------------------------------------

-- Remove the task-owned relationship from RecurrenceRule.
ALTER TABLE `RecurrenceRule`
  DROP FOREIGN KEY `FK_RecurrenceRule_taskID`;

ALTER TABLE `RecurrenceRule`
  DROP INDEX `FK_RecurrenceRule_taskID_idx`;

ALTER TABLE `RecurrenceRule`
  DROP COLUMN `taskID`;

-- Enforce the Task.recurrenceRuleID reference.
ALTER TABLE `Task`
  ADD INDEX `FK_Task_recurrenceRuleID_idx` (`recurrenceRuleID` ASC);

ALTER TABLE `Task`
  ADD CONSTRAINT `FK_Task_recurrenceRuleID`
    FOREIGN KEY (`recurrenceRuleID`)
    REFERENCES `RecurrenceRule` (`recurrenceRuleID`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- 4. Tasks may optionally belong to a project.
-- -----------------------------------------------------------------------------
ALTER TABLE `Task`
  ADD COLUMN `projectID` INT NULL AFTER `recurrenceRuleID`;

ALTER TABLE `Task`
  ADD INDEX `FK_Task_projectID_idx` (`projectID` ASC);

ALTER TABLE `Task`
  ADD CONSTRAINT `FK_Task_projectID`
    FOREIGN KEY (`projectID`)
    REFERENCES `Project` (`projectID`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- 5. TaskTag stores many-to-many task and tag assignments.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `TaskTag` (
  `taskID` INT NOT NULL,
  `tagID`  INT NOT NULL,
  PRIMARY KEY (`taskID`, `tagID`),
  INDEX `FK_TaskTag_tagID_idx` (`tagID` ASC),
  CONSTRAINT `FK_TaskTag_taskID`
    FOREIGN KEY (`taskID`)
    REFERENCES `Task` (`taskID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `FK_TaskTag_tagID`
    FOREIGN KEY (`tagID`)
    REFERENCES `Tag` (`tagID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 6. Task.createdAt records creation time for sorting and audit display.
-- -----------------------------------------------------------------------------
ALTER TABLE `Task`
  ADD COLUMN `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  AFTER `dateTimeScheduled`;


-- -----------------------------------------------------------------------------
-- 7. Task(userID, dateTimeScheduled) supports user-scoped chronological reads.
-- -----------------------------------------------------------------------------
ALTER TABLE `Task`
  ADD INDEX `idx_Task_userID_dateTimeScheduled` (`userID` ASC, `dateTimeScheduled` ASC);


-- -----------------------------------------------------------------------------
-- 8. Task.priority stores optional LOW / MEDIUM / HIGH urgency.
-- -----------------------------------------------------------------------------
ALTER TABLE `Task`
  ADD COLUMN `priority` VARCHAR(20) NULL DEFAULT NULL
  CHECK (`priority` IN ('LOW', 'MEDIUM', 'HIGH'));


-- -----------------------------------------------------------------------------
-- 9. Project.userID is nullable while projects are not tied to authenticated users.
-- -----------------------------------------------------------------------------
ALTER TABLE `Project`
  MODIFY `userID` INT NULL;
