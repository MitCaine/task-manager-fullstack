ALTER TABLE RecurrenceRule
  ADD COLUMN intervalUnit VARCHAR(10) NULL AFTER frequency,
  ADD COLUMN intervalValue INT NULL AFTER intervalUnit;

UPDATE RecurrenceRule
SET
  intervalUnit = CASE frequency
    WHEN 'daily' THEN 'day'
    WHEN 'weekly' THEN 'week'
    WHEN 'monthly' THEN 'month'
    ELSE intervalUnit
  END,
  intervalValue = CASE
    WHEN frequency IN ('daily', 'weekly', 'monthly') THEN 1
    ELSE intervalValue
  END;

ALTER TABLE RecurrenceRule
  MODIFY COLUMN frequency VARCHAR(45) NULL,
  MODIFY COLUMN intervalUnit VARCHAR(10) NOT NULL,
  MODIFY COLUMN intervalValue INT NOT NULL DEFAULT 1;
