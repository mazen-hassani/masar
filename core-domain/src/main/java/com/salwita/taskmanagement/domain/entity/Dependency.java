package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.enums.DependencyType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "dependencies")
@EntityListeners(AuditingEntityListener.class)
public class Dependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "dependency_type", nullable = false)
    @NotNull
    private DependencyType dependencyType;

    @Column(name = "lag_in_minutes")
    private Integer lagInMinutes = 0; // Can be negative (lead)

    @Column(name = "description")
    private String description;

    // Activity-to-Activity dependencies
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "predecessor_activity_id")
    private Activity predecessorActivity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "successor_activity_id")
    private Activity successorActivity;

    // Task-to-Task dependencies
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "predecessor_task_id")
    private Task predecessorTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "successor_task_id")
    private Task successorTask;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Dependency() {
        // Default constructor for JPA
    }

    // Activity-to-Activity dependency constructor
    public Dependency(Activity predecessorActivity, Activity successorActivity, DependencyType dependencyType) {
        this.predecessorActivity = predecessorActivity;
        this.successorActivity = successorActivity;
        this.dependencyType = dependencyType;
        validateSameProject();
    }

    // Task-to-Task dependency constructor
    public Dependency(Task predecessorTask, Task successorTask, DependencyType dependencyType) {
        this.predecessorTask = predecessorTask;
        this.successorTask = successorTask;
        this.dependencyType = dependencyType;
        validateSameProject();
    }

    // Activity-to-Activity dependency constructor with lag
    public Dependency(Activity predecessorActivity, Activity successorActivity, DependencyType dependencyType, Integer lagInMinutes) {
        this(predecessorActivity, successorActivity, dependencyType);
        this.lagInMinutes = lagInMinutes;
    }

    // Task-to-Task dependency constructor with lag
    public Dependency(Task predecessorTask, Task successorTask, DependencyType dependencyType, Integer lagInMinutes) {
        this(predecessorTask, successorTask, dependencyType);
        this.lagInMinutes = lagInMinutes;
    }

    // Business methods
    private void validateSameProject() {
        Project predecessorProject = getPredecessorProject();
        Project successorProject = getSuccessorProject();
        
        if (predecessorProject != null && successorProject != null && 
            !predecessorProject.equals(successorProject)) {
            throw new IllegalArgumentException("Dependencies can only be created within the same project");
        }
    }

    public Project getPredecessorProject() {
        if (predecessorActivity != null) {
            return predecessorActivity.getProject();
        } else if (predecessorTask != null) {
            return predecessorTask.getActivity().getProject();
        }
        return null;
    }

    public Project getSuccessorProject() {
        if (successorActivity != null) {
            return successorActivity.getProject();
        } else if (successorTask != null) {
            return successorTask.getActivity().getProject();
        }
        return null;
    }

    public boolean isActivityDependency() {
        return predecessorActivity != null && successorActivity != null;
    }

    public boolean isTaskDependency() {
        return predecessorTask != null && successorTask != null;
    }

    public void updateLag(Integer lagInMinutes) {
        this.lagInMinutes = lagInMinutes;
    }

    public void updateDependencyType(DependencyType dependencyType) {
        Project project = getPredecessorProject();
        if (project != null && !project.supportsDependencyType(dependencyType)) {
            throw new IllegalArgumentException("Project does not support dependency type: " + dependencyType);
        }
        this.dependencyType = dependencyType;
    }

    public String getPredecessorName() {
        if (predecessorActivity != null) {
            return predecessorActivity.getName();
        } else if (predecessorTask != null) {
            return predecessorTask.getName();
        }
        return "Unknown";
    }

    public String getSuccessorName() {
        if (successorActivity != null) {
            return successorActivity.getName();
        } else if (successorTask != null) {
            return successorTask.getName();
        }
        return "Unknown";
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public DependencyType getDependencyType() {
        return dependencyType;
    }

    public void setDependencyType(DependencyType dependencyType) {
        this.dependencyType = dependencyType;
    }

    public Integer getLagInMinutes() {
        return lagInMinutes;
    }

    public void setLagInMinutes(Integer lagInMinutes) {
        this.lagInMinutes = lagInMinutes;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Activity getPredecessorActivity() {
        return predecessorActivity;
    }

    public void setPredecessorActivity(Activity predecessorActivity) {
        this.predecessorActivity = predecessorActivity;
    }

    public Activity getSuccessorActivity() {
        return successorActivity;
    }

    public void setSuccessorActivity(Activity successorActivity) {
        this.successorActivity = successorActivity;
    }

    public Task getPredecessorTask() {
        return predecessorTask;
    }

    public void setPredecessorTask(Task predecessorTask) {
        this.predecessorTask = predecessorTask;
    }

    public Task getSuccessorTask() {
        return successorTask;
    }

    public void setSuccessorTask(Task successorTask) {
        this.successorTask = successorTask;
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
        Dependency that = (Dependency) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Dependency{" +
               "id=" + id +
               ", dependencyType=" + dependencyType +
               ", lagInMinutes=" + lagInMinutes +
               ", predecessor='" + getPredecessorName() + '\'' +
               ", successor='" + getSuccessorName() + '\'' +
               '}';
    }
}