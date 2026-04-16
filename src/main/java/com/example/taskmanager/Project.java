package com.example.taskmanager;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

@Entity
@Table(name = "Project")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectID;

    @NotBlank(message = "Title must not be blank")
    @Size(max = 25, message = "Title must not exceed 25 characters")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "dueDate")
    private LocalDateTime dueDate;

    @Column(name = "userID")
    private Long userID;

    public Long getProjectID() { return projectID; }
    public void setProjectID(Long projectID) { this.projectID = projectID; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

    public Long getUserID() { return userID; }
    public void setUserID(Long userID) { this.userID = userID; }
}
