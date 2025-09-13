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
@Table(name = "template_dependencies")
@EntityListeners(AuditingEntityListener.class)
public class TemplateDependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "dependency_type", nullable = false)
    @NotNull
    private DependencyType dependencyType;

    @Column(name = "lag_in_minutes")
    private Integer lagInMinutes = 0;

    @Column(name = "description", length = 500)
    private String description;

    // Activity-level dependencies
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "predecessor_template_activity_id")
    private TemplateActivity predecessorTemplateActivity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "successor_template_activity_id")
    private TemplateActivity successorTemplateActivity;

    // Task-level dependencies
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "predecessor_template_task_id")
    private TemplateTask predecessorTemplateTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "successor_template_task_id")
    private TemplateTask successorTemplateTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_template_id", nullable = false)
    @NotNull
    private ProjectTemplate projectTemplate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected TemplateDependency() {
        // Default constructor for JPA
    }

    // Constructor for activity-level dependency
    public TemplateDependency(DependencyType dependencyType, TemplateActivity predecessorActivity, 
                             TemplateActivity successorActivity, ProjectTemplate projectTemplate) {
        this.dependencyType = dependencyType;
        this.predecessorTemplateActivity = predecessorActivity;
        this.successorTemplateActivity = successorActivity;
        this.projectTemplate = projectTemplate;
        validateActivityDependency();
    }

    // Constructor for task-level dependency
    public TemplateDependency(DependencyType dependencyType, TemplateTask predecessorTask, 
                             TemplateTask successorTask, ProjectTemplate projectTemplate) {
        this.dependencyType = dependencyType;
        this.predecessorTemplateTask = predecessorTask;
        this.successorTemplateTask = successorTask;
        this.projectTemplate = projectTemplate;
        validateTaskDependency();
    }

    public void setLag(Integer lagInMinutes) {
        this.lagInMinutes = lagInMinutes != null ? lagInMinutes : 0;
    }

    public boolean isActivityDependency() {
        return predecessorTemplateActivity != null && successorTemplateActivity != null;
    }

    public boolean isTaskDependency() {
        return predecessorTemplateTask != null && successorTemplateTask != null;
    }

    public String getDependencyDescription() {
        if (isActivityDependency()) {
            return String.format("%s -> %s (%s, lag: %d min)", 
                predecessorTemplateActivity.getName(),
                successorTemplateActivity.getName(),
                dependencyType.name(),
                lagInMinutes);
        } else if (isTaskDependency()) {
            return String.format("%s -> %s (%s, lag: %d min)", 
                predecessorTemplateTask.getName(),
                successorTemplateTask.getName(),
                dependencyType.name(),
                lagInMinutes);
        }
        return "Invalid dependency";
    }

    private void validateActivityDependency() {
        if (predecessorTemplateActivity == null || successorTemplateActivity == null) {
            throw new IllegalArgumentException("Both predecessor and successor activities must be specified");
        }
        
        if (predecessorTemplateActivity.equals(successorTemplateActivity)) {
            throw new IllegalArgumentException("Activity cannot depend on itself");
        }
        
        if (!predecessorTemplateActivity.getProjectTemplate().equals(projectTemplate) ||
            !successorTemplateActivity.getProjectTemplate().equals(projectTemplate)) {
            throw new IllegalArgumentException("Activities must belong to the same project template");
        }
    }

    private void validateTaskDependency() {
        if (predecessorTemplateTask == null || successorTemplateTask == null) {
            throw new IllegalArgumentException("Both predecessor and successor tasks must be specified");
        }
        
        if (predecessorTemplateTask.equals(successorTemplateTask)) {
            throw new IllegalArgumentException("Task cannot depend on itself");
        }
        
        if (!predecessorTemplateTask.getTemplateActivity().getProjectTemplate().equals(projectTemplate) ||
            !successorTemplateTask.getTemplateActivity().getProjectTemplate().equals(projectTemplate)) {
            throw new IllegalArgumentException("Tasks must belong to the same project template");
        }
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

    public TemplateActivity getPredecessorTemplateActivity() {
        return predecessorTemplateActivity;
    }

    public void setPredecessorTemplateActivity(TemplateActivity predecessorTemplateActivity) {
        this.predecessorTemplateActivity = predecessorTemplateActivity;
    }

    public TemplateActivity getSuccessorTemplateActivity() {
        return successorTemplateActivity;
    }

    public void setSuccessorTemplateActivity(TemplateActivity successorTemplateActivity) {
        this.successorTemplateActivity = successorTemplateActivity;
    }

    public TemplateTask getPredecessorTemplateTask() {
        return predecessorTemplateTask;
    }

    public void setPredecessorTemplateTask(TemplateTask predecessorTemplateTask) {
        this.predecessorTemplateTask = predecessorTemplateTask;
    }

    public TemplateTask getSuccessorTemplateTask() {
        return successorTemplateTask;
    }

    public void setSuccessorTemplateTask(TemplateTask successorTemplateTask) {
        this.successorTemplateTask = successorTemplateTask;
    }

    public ProjectTemplate getProjectTemplate() {
        return projectTemplate;
    }

    public void setProjectTemplate(ProjectTemplate projectTemplate) {
        this.projectTemplate = projectTemplate;
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
        TemplateDependency that = (TemplateDependency) o;
        return Objects.equals(dependencyType, that.dependencyType) &&
               Objects.equals(predecessorTemplateActivity, that.predecessorTemplateActivity) &&
               Objects.equals(successorTemplateActivity, that.successorTemplateActivity) &&
               Objects.equals(predecessorTemplateTask, that.predecessorTemplateTask) &&
               Objects.equals(successorTemplateTask, that.successorTemplateTask) &&
               Objects.equals(projectTemplate, that.projectTemplate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(dependencyType, predecessorTemplateActivity, successorTemplateActivity,
                           predecessorTemplateTask, successorTemplateTask, projectTemplate);
    }

    @Override
    public String toString() {
        return "TemplateDependency{" +
               "id=" + id +
               ", dependencyType=" + dependencyType +
               ", lagInMinutes=" + lagInMinutes +
               ", description='" + getDependencyDescription() + '\'' +
               '}';
    }
}