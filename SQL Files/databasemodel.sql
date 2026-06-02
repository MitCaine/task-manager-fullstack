-- MySQL dump 10.13  Distrib 9.6.0, for macos26.4 (arm64)
--
-- Host: localhost    Database: taskmanagementdb
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Account`
--

DROP TABLE IF EXISTS `Account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Account` (
  `accountID` int NOT NULL AUTO_INCREMENT,
  `creationDate` datetime NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `userID` int NOT NULL,
  PRIMARY KEY (`accountID`),
  KEY `userID_idx` (`userID`),
  CONSTRAINT `FK_Account_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Attachment`
--

DROP TABLE IF EXISTS `Attachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Attachment` (
  `attachmentID` int NOT NULL AUTO_INCREMENT,
  `fileORLink` varchar(255) NOT NULL,
  `metadata` text,
  `fileSize` bigint NOT NULL,
  `taskID` int DEFAULT NULL,
  PRIMARY KEY (`attachmentID`),
  KEY `FK_Attachment_taskID_idx` (`taskID`),
  CONSTRAINT `FK_Attachment_taskID` FOREIGN KEY (`taskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Context`
--

DROP TABLE IF EXISTS `Context`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Context` (
  `contextID` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `description` text,
  `userID` int NOT NULL,
  PRIMARY KEY (`contextID`),
  KEY `FK_Context_userID_idx` (`userID`),
  CONSTRAINT `FK_Context_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CustomField`
--

DROP TABLE IF EXISTS `CustomField`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CustomField` (
  `customFieldID` int NOT NULL AUTO_INCREMENT,
  `fieldType` varchar(45) NOT NULL,
  `title` varchar(100) NOT NULL,
  `userID` int NOT NULL,
  `defaultValue` text,
  PRIMARY KEY (`customFieldID`),
  KEY `FK_CustomField_userID_idx` (`userID`),
  CONSTRAINT `FK_CustomField_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Device`
--

DROP TABLE IF EXISTS `Device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Device` (
  `deviceID` int NOT NULL AUTO_INCREMENT,
  `deviceType` varchar(45) NOT NULL,
  `operatingSystem` varchar(45) NOT NULL,
  `userID` int NOT NULL,
  PRIMARY KEY (`deviceID`),
  KEY `FK_DeviceTable_userID_idx` (`userID`),
  CONSTRAINT `FK_DeviceTable_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Note`
--

DROP TABLE IF EXISTS `Note`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Note` (
  `noteID` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `context` text NOT NULL,
  `timestamp` datetime NOT NULL,
  `taskID` int NOT NULL,
  PRIMARY KEY (`noteID`),
  KEY `FK_Note_taskID_idx` (`taskID`),
  KEY `idx_Note_taskID_timestamp` (`taskID`,`timestamp`),
  CONSTRAINT `FK_Note_taskID` FOREIGN KEY (`taskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Notification`
--

DROP TABLE IF EXISTS `Notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notification` (
  `notificationID` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `userID` int NOT NULL,
  `taskID` int NOT NULL,
  `message` text,
  `reminderID` int DEFAULT NULL,
  `contextID` int DEFAULT NULL,
  PRIMARY KEY (`notificationID`),
  KEY `FK_Notification_userID_idx` (`userID`),
  KEY `FK_Notification_taskID_idx` (`taskID`),
  KEY `FK_Notification_reminderID_idx` (`reminderID`),
  KEY `FK_Notification_contextID_idx` (`contextID`),
  CONSTRAINT `FK_Notification_contextID` FOREIGN KEY (`contextID`) REFERENCES `Context` (`contextID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Notification_reminderID` FOREIGN KEY (`reminderID`) REFERENCES `Reminder` (`reminderID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Notification_taskID` FOREIGN KEY (`taskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Notification_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Project`
--

DROP TABLE IF EXISTS `Project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Project` (
  `projectID` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `dueDate` datetime DEFAULT NULL,
  `description` text,
  `userID` int DEFAULT NULL,
  PRIMARY KEY (`projectID`),
  KEY `FK_Project_userID_idx` (`userID`),
  CONSTRAINT `FK_Project_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RecurrenceRule`
--

DROP TABLE IF EXISTS `RecurrenceRule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RecurrenceRule` (
  `recurrenceRuleID` int NOT NULL AUTO_INCREMENT,
  `timesOfRecurrence` int NOT NULL,
  `startDateTime` datetime NOT NULL,
  `endDateTime` datetime NOT NULL,
  `frequency` varchar(45) NOT NULL,
  PRIMARY KEY (`recurrenceRuleID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Reminder`
--

DROP TABLE IF EXISTS `Reminder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Reminder` (
  `reminderID` int NOT NULL AUTO_INCREMENT,
  `dueDate` datetime NOT NULL,
  `notificationMethod` varchar(45) NOT NULL,
  `message` text,
  `taskID` int NOT NULL,
  PRIMARY KEY (`reminderID`),
  KEY `FK_Reminder_taskID_idx` (`taskID`),
  KEY `idx_Reminder_dueDate` (`dueDate`),
  CONSTRAINT `FK_Reminder_taskID` FOREIGN KEY (`taskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Schedule`
--

DROP TABLE IF EXISTS `Schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Schedule` (
  `scheduleID` int NOT NULL AUTO_INCREMENT,
  `startDateTime` datetime NOT NULL,
  `endDateTime` datetime NOT NULL,
  PRIMARY KEY (`scheduleID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Status`
--

DROP TABLE IF EXISTS `Status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Status` (
  `statusID` int NOT NULL AUTO_INCREMENT,
  `state` varchar(45) NOT NULL,
  PRIMARY KEY (`statusID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Subtask`
--

DROP TABLE IF EXISTS `Subtask`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Subtask` (
  `subTaskID` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `statusID` int NOT NULL,
  `dateTimeScheduled` datetime DEFAULT NULL,
  `parentTaskID` int DEFAULT NULL,
  PRIMARY KEY (`subTaskID`),
  KEY `FK_Subtask_statusID_idx` (`statusID`),
  KEY `FK_Subtask_parentTaskID_idx` (`parentTaskID`),
  KEY `idx_Subtask_parentTaskID_statusID` (`parentTaskID`,`statusID`),
  CONSTRAINT `FK_Subtask_parentTaskID` FOREIGN KEY (`parentTaskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Subtask_statusID` FOREIGN KEY (`statusID`) REFERENCES `Status` (`statusID`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Tag`
--

DROP TABLE IF EXISTS `Tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tag` (
  `tagID` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `userID` int DEFAULT NULL,
  PRIMARY KEY (`tagID`),
  KEY `FK_Tag_userID_idx` (`userID`),
  CONSTRAINT `FK_Tag_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Task`
--

DROP TABLE IF EXISTS `Task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Task` (
  `taskID` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `description` text,
  `dateTimeScheduled` datetime DEFAULT NULL,
  `endDateTimeScheduled` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `statusID` int DEFAULT NULL,
  `userID` int DEFAULT NULL,
  `scheduleID` int DEFAULT NULL,
  `recurrenceRuleID` int DEFAULT NULL,
  `projectID` int DEFAULT NULL,
  `priority` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`taskID`),
  KEY `FK_Task_userID_idx` (`userID`),
  KEY `FK_Task_statusID_idx` (`statusID`),
  KEY `FK_Task_scheduleID_idx` (`scheduleID`),
  KEY `FK_Task_recurrenceRuleID_idx` (`recurrenceRuleID`),
  KEY `FK_Task_projectID_idx` (`projectID`),
  KEY `idx_Task_userID_dateTimeScheduled` (`userID`,`dateTimeScheduled`),
  KEY `idx_Task_priority` (`priority`),
  CONSTRAINT `FK_Task_projectID` FOREIGN KEY (`projectID`) REFERENCES `Project` (`projectID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_Task_recurrenceRuleID` FOREIGN KEY (`recurrenceRuleID`) REFERENCES `RecurrenceRule` (`recurrenceRuleID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_Task_scheduleID` FOREIGN KEY (`scheduleID`) REFERENCES `Schedule` (`scheduleID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_Task_statusID` FOREIGN KEY (`statusID`) REFERENCES `Status` (`statusID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_Task_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `task_chk_1` CHECK ((`priority` in (_utf8mb4'LOW',_utf8mb4'MEDIUM',_utf8mb4'HIGH')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TaskDependency`
--

DROP TABLE IF EXISTS `TaskDependency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TaskDependency` (
  `predecessorTaskID` int NOT NULL,
  `successorTaskID` int NOT NULL,
  `dependencyType` varchar(45) NOT NULL,
  PRIMARY KEY (`predecessorTaskID`,`successorTaskID`),
  KEY `FK_TaskDependency_sucessorTaskID_idx` (`successorTaskID`),
  CONSTRAINT `FK_TaskDependency_predecessorTaskID` FOREIGN KEY (`predecessorTaskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_TaskDependency_sucessorTaskID` FOREIGN KEY (`successorTaskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TaskInstance`
--

DROP TABLE IF EXISTS `TaskInstance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TaskInstance` (
  `taskInstanceID` int NOT NULL AUTO_INCREMENT,
  `statusID` int NOT NULL,
  `scheduleID` int DEFAULT NULL,
  `recurrenceRuleID` int DEFAULT NULL,
  `completionDateTime` datetime DEFAULT NULL,
  PRIMARY KEY (`taskInstanceID`),
  KEY `FK_TaskInstance_statusID_idx` (`statusID`),
  KEY `FK_TaskInstance_scheduleID_idx` (`scheduleID`),
  KEY `FK_TaskInstance_recurrenceRuleID_idx` (`recurrenceRuleID`),
  KEY `idx_TaskInstance_completionDateTime` (`completionDateTime`),
  CONSTRAINT `FK_TaskInstance_recurrenceRuleID` FOREIGN KEY (`recurrenceRuleID`) REFERENCES `RecurrenceRule` (`recurrenceRuleID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_TaskInstance_scheduleID` FOREIGN KEY (`scheduleID`) REFERENCES `Schedule` (`scheduleID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_TaskInstance_statusID` FOREIGN KEY (`statusID`) REFERENCES `Status` (`statusID`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TaskTag`
--

DROP TABLE IF EXISTS `TaskTag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TaskTag` (
  `taskID` int NOT NULL,
  `tagID` int NOT NULL,
  PRIMARY KEY (`taskID`,`tagID`),
  KEY `FK_TaskTag_tagID_idx` (`tagID`),
  CONSTRAINT `FK_TaskTag_tagID` FOREIGN KEY (`tagID`) REFERENCES `Tag` (`tagID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_TaskTag_taskID` FOREIGN KEY (`taskID`) REFERENCES `Task` (`taskID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `userID` int NOT NULL AUTO_INCREMENT,
  `username` varchar(45) NOT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`userID`),
  UNIQUE KEY `username_UNIQUE` (`username`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserPreferences`
--

DROP TABLE IF EXISTS `UserPreferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserPreferences` (
  `preferenceID` int NOT NULL AUTO_INCREMENT,
  `notificationSettings` varchar(100) NOT NULL,
  `defaultReminderTimes` time DEFAULT NULL,
  `defaultTaskProperties` text,
  `userID` int NOT NULL,
  PRIMARY KEY (`preferenceID`),
  KEY `FK_UserPreferences_userID_idx` (`userID`),
  CONSTRAINT `FK_UserPreferences_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserSettings`
--

DROP TABLE IF EXISTS `UserSettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserSettings` (
  `settingsID` int NOT NULL AUTO_INCREMENT,
  `privacySettings` varchar(100) NOT NULL,
  `accountSecuritySettings` varchar(100) NOT NULL,
  `userID` int NOT NULL,
  PRIMARY KEY (`settingsID`),
  KEY `FK_UserSettings_userID_idx` (`userID`),
  CONSTRAINT `FK_UserSettings_userID` FOREIGN KEY (`userID`) REFERENCES `User` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-01 20:41:11
