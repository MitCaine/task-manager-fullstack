package com.mitchell.taskmanager;

import jakarta.persistence.*;

@Entity
@Table(name = "Status")
public class Status {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long statusID;

    private String state;

    public Long getStatusID() { return statusID; }
    public void setStatusID(Long statusID) { this.statusID = statusID; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
}
