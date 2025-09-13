package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.valueobject.ExternalRefs;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "template_tasks")
@EntityListeners(AuditingEntityListener.class)
public class TemplateTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "estimated_duration_hours", nullable = false)
    private Integer estimatedDurationHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "required_assignee_role")
    private Role requiredAssigneeRole;

    @Column(name = "requires_specific_skills", columnDefinition = "TEXT")
    private String requiresSpecificSkills;

    @Embedded
    private ExternalRefs externalRefs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_activity_id", nullable = false)
    @NotNull
    private TemplateActivity templateActivity;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected TemplateTask() {
        // Default constructor for JPA
    }

    public TemplateTask(String name, String description, Integer estimatedDurationHours, TemplateActivity templateActivity) {
        this.name = name;
        this.description = description;
        this.estimatedDurationHours = estimatedDurationHours;
        this.templateActivity = templateActivity;
        this.displayOrder = 0; // Will be set when added to activity
        this.requiredAssigneeRole = Role.TEAM_MEMBER; // Default role requirement
    }

    public TemplateTask(String name, String description, Integer estimatedDurationHours, 
                       Role requiredAssigneeRole, TemplateActivity templateActivity) {
        this.name = name;
        this.description = description;
        this.estimatedDurationHours = estimatedDurationHours;
        this.requiredAssigneeRole = requiredAssigneeRole;
        this.templateActivity = templateActivity;
        this.displayOrder = 0; // Will be set when added to activity
    }

    public boolean canBeAssignedTo(User user) {
        if (requiredAssigneeRole == null) {
            return true; // No role requirement
        }
        
        // Check if user's role matches or is higher privilege
        return switch (requiredAssigneeRole) {
            case TEAM_MEMBER -> true; // Anyone can be assigned team member tasks
            case PM -> user.getRole() == Role.PM || user.getRole() == Role.PMO;
            case PMO -> user.getRole() == Role.PMO;
            case CLIENT -> user.getRole() == Role.CLIENT;
        };
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

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public Integer getEstimatedDurationHours() {
        return estimatedDurationHours;
    }

    public void setEstimatedDurationHours(Integer estimatedDurationHours) {
        this.estimatedDurationHours = estimatedDurationHours;
    }

    public Role getRequiredAssigneeRole() {
        return requiredAssigneeRole;
    }

    public void setRequiredAssigneeRole(Role requiredAssigneeRole) {
        this.requiredAssigneeRole = requiredAssigneeRole;
    }

    public String getRequiresSpecificSkills() {
        return requiresSpecificSkills;
    }

    public void setRequiresSpecificSkills(String requiresSpecificSkills) {
        this.requiresSpecificSkills = requiresSpecificSkills;
    }

    public ExternalRefs getExternalRefs() {
        return externalRefs;
    }

    public void setExternalRefs(ExternalRefs externalRefs) {
        this.externalRefs = externalRefs;
    }

    public TemplateActivity getTemplateActivity() {
        return templateActivity;
    }

    public void setTemplateActivity(TemplateActivity templateActivity) {
        this.templateActivity = templateActivity;
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
        TemplateTask that = (TemplateTask) o;
        return Objects.equals(name, that.name) &&
               Objects.equals(templateActivity, that.templateActivity) &&
               Objects.equals(displayOrder, that.displayOrder);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, templateActivity, displayOrder);
    }

    @Override
    public String toString() {
        return "TemplateTask{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", displayOrder=" + displayOrder +
               ", estimatedDurationHours=" + estimatedDurationHours +
               ", requiredAssigneeRole=" + requiredAssigneeRole +
               '}';
    }
}