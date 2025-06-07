-- The purpose of this file is to test my database by inserting data into TaskManagementDB

USE TaskManagementDB;

INSERT INTO User (userID, username, email) 
VALUES 
	(1, 'mitchellcaine', 'mitchellcaine@email.com'),
	(2, 'linaeus', 'linaeus@email.com'),
	(3, 'johndoe', 'johndoe@email.com');

INSERT INTO Account (accountID, creationDate, status, userID) 
VALUES 
	(1, '2024-01-01 08:00:00', 'active', 1),
	(2, '2024-01-01 09:00:00', 'inactive', 2),
	(3, '2024-01-02 10:00:00', 'active', 3);

INSERT INTO Status (statusID, state) 
VALUES 
	(1, 'active'),
	(2, 'completed'),
	(3, 'in progress');

INSERT INTO Schedule (scheduleID, startDateTime, endDateTime) 
VALUES 
	(1, '2024-01-01 08:00:00', '2024-01-01 09:00:00'),
	(2, '2024-01-01 10:00:00', '2024-01-01 11:00:00'),
	(3, '2024-01-02 12:00:00', '2024-01-02 13:00:00');

INSERT INTO Tag (tagID, title, color, userID, Tagcol) 
VALUES 
	(1, 'Urgent', 'red', 1, 'default_value'),
	(2, 'Important', 'blue', 2, 'default_value'),
	(3, 'Optional', 'green', 3, 'default_value');

INSERT INTO Project (projectID, title, dueDate, description, userID) 
VALUES 
	(1, 'Project a', '2024-01-01', 'Complete documentation for a', 1),
	(2, 'Project b', '2024-01-01', 'b', 2),
	(3, 'Project c', '2024-02-01', 'Prepare presentation for c', 3);

INSERT INTO Task (taskID, title, dateTimeScheduled, statusID, userID, scheduleID, recurrenceRuleID) 
VALUES 
	(1, 'Task 1', '2024-01-01 08:00:00', 1, 1, 1, NULL),
	(2, 'Task 2', '2024-01-01 09:00:00', 2, 2, 2, NULL),
	(3, 'Task 3', '2024-01-02 08:00:00', 3, 3, 3, NULL);

INSERT INTO Reminder (reminderID, dueDate, notificationMethod, message, taskID) 
VALUES 
	(1, '2024-01-01 08:00:00', 'email', 'Task due soon!', 1),
	(2, '2024-01-01 09:00:00', 'SMS', 'Meeting reminder', 2),
	(3, '2024-01-02 10:00:00', 'push', 'Task update alert', 3);

INSERT INTO Subtask (subTaskID, title, statusID, dateTimeScheduled, parentTaskID, Subtaskcol) 
VALUES 
	(1, 'Write intro section', 1, '2024-01-01 08:00:00', 1, 'default_value'),
	(2, 'Create diagrams', 2, '2024-01-01 09:00:00', 1, 'default_value'),
	(3, 'Review final draft', 3, '2024-01-02 08:00:00', 2, 'default_value');

INSERT INTO TaskDependency (predecessorTaskID, successorTaskID, dependencyType) 
VALUES 
	(1, 2, 'blocker'),
	(2, 3, 'related'),
	(3, 1, 'prerequisite');

INSERT INTO UserPreferences (preferenceID, notificationSettings, defaultReminderTimes, defaultTaskProperties, userID) 
VALUES 
	(1, 'email', '08:00:00', 'high_priority', 1),
	(2, 'push', '09:00:00', 'default', 2),
	(3, 'SMS', '10:00:00', 'low_priority', 3);

INSERT INTO UserSettings (settingsID, privacySettings, accountSecuritySettings, userID) 
VALUES 
	(1, 'private', '2FA_enabled', 1),
	(2, 'public', 'none', 2),
	(3, 'friends_only', 'password_protected', 3);

INSERT INTO Note (noteID, title, context, timestamp, taskID) 
VALUES 
	(1, 'Meeting Notes', 'Discuss deadlines', '2024-01-01 08:00:00', 1),
	(2, 'Ideas', 'Brainstorm features', '2024-01-01 09:00:00', 2),
	(3, 'To-Do List', 'Prepare slides', '2024-01-02 10:00:00', 3);

INSERT INTO Attachment (attachmentID, fileORLink, metadata, fileSize, taskID, Attachmentcol) 
VALUES 
	(1, 'link_to_file', 'pdf', 1024, 1, 'default_value'),
	(2, 'link_to_image', 'png', 2048, 2, 'default_value'),
	(3, 'link_to_video', 'mp4', 4096, 3, 'default_value');

INSERT INTO RecurrenceRule (recurrenceRuleID, timesOfRecurrence, stateDateTime, endDateTime, frequency, taskID) 
VALUES 
	(1, 5, '2024-01-01 08:00:00', '2024-01-01 09:00:00', 'daily', 1),
	(2, 10, '2024-01-01 10:00:00', '2024-01-01 11:00:00', 'weekly', 2),
	(3, 15, '2024-02-01 12:00:00', '2024-02-01 13:00:00', 'monthly', 3);

INSERT INTO TaskInstance (taskInstanceID, statusID, scheduleID, recurrenceRuleID, completionDateTime) 
VALUES 
	(1, 1, 1, 1, '2024-01-01 08:00:00'),
	(2, 2, 2, 2, '2024-01-01 09:00:00'),
	(3, 3, 3, 3, '2024-01-02 08:00:00');

INSERT INTO CustomField (customFieldID, fieldType, title, userID, defaultValue) 
VALUES 
	(1, 'text', 'Priority', 1, 'High'),
	(2, 'number', 'Effort Hours', 2, 8),
	(3, 'dropdown', 'Category', 3, 'Work');

INSERT INTO Context (contextID, title, description, userID) 
VALUES 
	(1, 'Work', 'Office-related tasks', 1),
	(2, 'Personal', 'Home and personal tasks', 2),
	(3, 'School', 'Assignments and projects', 3);

INSERT INTO Notification (notificationID, timestamp, userID, taskID, message, reminderID, contextID) 
VALUES 
	(1, '2024-01-01 08:00:00', 1, 1, 'Task due!', 1, 1),
	(2, '2024-01-01 09:00:00', 2, 2, 'Meeting soon!', 2, 2),
	(3, '2024-01-02 10:00:00', 3, 3, 'Prepare report!', 3, 3);
