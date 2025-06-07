-- Provides SQL solutions for business requirements for TaskManagementDB

USE TaskManagementDB;

Delimiter $$

/*
Business Requirement 1: Task Completion Analytics

Purpose: Tracks performance through analytics
Problem: System needs to calculate the percentage of completed tasks.
Challenges: Need real-time analytics while keeping good performance and data accuracy.
Assumptions: Overdue tasks should be done before current data.
			 Tasks have different statuses.
Implementation Plan: Make a view showing completed and overdue tasks by user and project.
					 Make a procedure to grab analytics for a specific project or user.
*/

CREATE VIEW TaskAnalytics AS
SELECT 
    t.userID,
    COUNT(CASE WHEN s.state = 'completed' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.dateTimeScheduled < CURDATE() AND s.state != 'completed' THEN 1 END) AS overdue_tasks,
    COUNT(*) AS total_tasks
FROM Task t
LEFT JOIN Status s ON t.statusID = s.statusID
GROUP BY t.userID;

CREATE PROCEDURE GetTaskAnalytics(IN userID INT)
BEGIN
    SELECT * 
    FROM TaskAnalytics
    WHERE userID = userID;
END$$

/*
Business Requirement 2: Basic Access Validation

Purpose: Make sure users who are active can do system operations.
Problem: Provide a way to validate if a user is currently active.
Challenges: Making sure users are actually active using current records.
Assumptions: User activity is determined if they exist in the User table.
Implementation Plan: Create a function which checks if the user exists in the table.
					 Use the IsUserActive function to validate access to the system.
                     
*/

CREATE FUNCTION IsUserActive(userID INT)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM User 
        WHERE userID = userID
    );
END$$

/*
Business Requirement 3: Task Recurring Management

Purpose: Automatically create recurring tasks.
Problem: Generate task instances based on recurring task rules.
Challenges: Tasks should recur while avoiding duplicates.
Assumptions: Recurring should have a frequency and a possible end date.
Implementation Plan: Create a procedure to have recurring tasks.
					 Schedule a procdure to run on a daily basis.
*/

CREATE PROCEDURE GenerateRecurringTasks()
BEGIN
    INSERT INTO TaskInstance (taskID, scheduleID, recurrenceRuleID, statusID, completionDateTime)
    SELECT 
        r.taskID, 
        t.scheduleID, 
        r.recurrenceRuleID, 
        1, -- Default status (active)
        DATE_ADD(CURDATE(), INTERVAL r.timesOfRecurrence DAY)
    FROM RecurrenceRule r
    JOIN Task t ON r.taskID = t.taskID
    WHERE DATE_ADD(CURDATE(), INTERVAL r.timesOfRecurrence DAY) <= r.endDateTime;
END$$

CREATE EVENT AutoGenerateTasks
ON SCHEDULE EVERY 1 DAY
DO
    CALL GenerateRecurringTasks();
$$

/*
Business Requirement 4: Context Notifications

Purpose: Automate notifications for users when tasks are overdue.
Problem: Make sure notifications are properly functioning based on their status.
Challenges: Making sure notifications do not overburden the system.
Assumptions: Nofications are based on user preference.
Implementation Plan: Create a procedure for notifications.
					 Schedule a procedure to run every hour.
*/

CREATE PROCEDURE GenerateNotifications()
BEGIN
    INSERT INTO Notification (timestamp, userID, taskID, message, reminderID, contextID)
    SELECT 
        NOW(),
        t.userID,
        t.taskID,
        CONCAT('Task "', t.title, '" is overdue!'),
        r.reminderID,
        c.contextID
    FROM Task t
    LEFT JOIN Reminder r ON t.taskID = r.taskID
    LEFT JOIN Context c ON c.contextID = t.userID
    WHERE t.dateTimeScheduled < CURDATE() AND t.statusID != (SELECT statusID FROM Status WHERE state = 'completed');
END$$

CREATE EVENT AutoGenerateNotifications
ON SCHEDULE EVERY 1 HOUR
DO
    CALL GenerateNotifications();
$$

/*
Business Requirement 5: User Productivity Summary

Purpose: Give user completion statistics.
Problem: Compute total tasks done and average time to complete them.
Challenges: Correct computation of the metrics given to the user.
Assumptions: The formula used is the difference between the time of the given task and the completion time.
Implementation Plan: Create a view to calculate the average completion time.
					 Create a procedure to generate the user statistics.
*/

CREATE VIEW UserProductivity AS
SELECT 
    t.userID,
    AVG(TIMESTAMPDIFF(HOUR, t.dateTimeScheduled, i.completionDateTime)) AS avg_completion_time,
    COUNT(i.taskInstanceID) AS tasks_completed
FROM Task t
JOIN TaskInstance i ON t.taskID = i.taskID
WHERE i.statusID = (SELECT statusID FROM Status WHERE state = 'completed')
GROUP BY t.userID;

DELIMITER ;