package com.example.taskmanager;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "Tag")
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tagID;

    @NotBlank(message = "Title must not be blank")
    private String title;

    @Column(name = "color")
    private String color;

    @Column(name = "userID")
    private Long userID;

    public Long getTagID() { return tagID; }
    public void setTagID(Long tagID) { this.tagID = tagID; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Long getUserID() { return userID; }
    public void setUserID(Long userID) { this.userID = userID; }
}
