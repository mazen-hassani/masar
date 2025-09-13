package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "organisations")
@EntityListeners(AuditingEntityListener.class)
public class Organisation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Embedded
    @NotNull
    private WorkingCalendar workingCalendar = WorkingCalendar.defaultCalendar();

    @Column(name = "at_risk_threshold_percentage", nullable = false)
    private Integer atRiskThresholdPercentage = 10; // 10% grace period

    @OneToMany(mappedBy = "organisation", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<User> users = new HashSet<>();

    @OneToMany(mappedBy = "organisation", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Project> projects = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Organisation() {
        // Default constructor for JPA
    }

    public Organisation(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public Organisation(String name, String description, WorkingCalendar workingCalendar) {
        this.name = name;
        this.description = description;
        this.workingCalendar = workingCalendar;
    }

    // Business methods
    public void updateWorkingCalendar(WorkingCalendar workingCalendar) {
        this.workingCalendar = workingCalendar;
    }

    public void updateAtRiskThreshold(Integer percentage) {
        if (percentage < 0 || percentage > 100) {
            throw new IllegalArgumentException("At risk threshold must be between 0 and 100");
        }
        this.atRiskThresholdPercentage = percentage;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public WorkingCalendar getWorkingCalendar() {
        return workingCalendar;
    }

    public void setWorkingCalendar(WorkingCalendar workingCalendar) {
        this.workingCalendar = workingCalendar;
    }

    public Integer getAtRiskThresholdPercentage() {
        return atRiskThresholdPercentage;
    }

    public void setAtRiskThresholdPercentage(Integer atRiskThresholdPercentage) {
        this.atRiskThresholdPercentage = atRiskThresholdPercentage;
    }

    public Set<User> getUsers() {
        return users;
    }

    public Set<Project> getProjects() {
        return projects;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Organisation that = (Organisation) o;
        return Objects.equals(id, that.id) && Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }

    @Override
    public String toString() {
        return "Organisation{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", description='" + description + '\'' +
               ", atRiskThresholdPercentage=" + atRiskThresholdPercentage +
               '}';
    }
}