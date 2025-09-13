package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.valueobject.ExternalRefs;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "template_activities")
@EntityListeners(AuditingEntityListener.class)
public class TemplateActivity {

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

    @Column(name = "verification_checklist", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<ChecklistItemTemplate> verificationChecklist = new ArrayList<>();

    @Embedded
    private ExternalRefs externalRefs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_template_id", nullable = false)
    @NotNull
    private ProjectTemplate projectTemplate;

    @OneToMany(mappedBy = "templateActivity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TemplateTask> templateTasks = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected TemplateActivity() {
        // Default constructor for JPA
    }

    public TemplateActivity(String name, String description, Integer estimatedDurationHours, ProjectTemplate projectTemplate) {
        this.name = name;
        this.description = description;
        this.estimatedDurationHours = estimatedDurationHours;
        this.projectTemplate = projectTemplate;
        this.displayOrder = 0; // Will be set when added to template
    }

    public void addTemplateTask(TemplateTask templateTask) {
        templateTasks.add(templateTask);
        templateTask.setTemplateActivity(this);
        // Update display order for the new task
        templateTask.setDisplayOrder(templateTasks.size());
    }

    public void removeTemplateTask(TemplateTask templateTask) {
        templateTasks.remove(templateTask);
        templateTask.setTemplateActivity(null);
        // Reorder remaining tasks
        for (int i = 0; i < templateTasks.size(); i++) {
            templateTasks.get(i).setDisplayOrder(i + 1);
        }
    }

    public void addChecklistItem(String description, boolean isRequired) {
        ChecklistItemTemplate item = new ChecklistItemTemplate(description, isRequired);
        verificationChecklist.add(item);
    }

    public void removeChecklistItem(int index) {
        if (index >= 0 && index < verificationChecklist.size()) {
            verificationChecklist.remove(index);
        }
    }

    public Integer calculateTotalEstimatedHours() {
        return templateTasks.stream()
                .mapToInt(TemplateTask::getEstimatedDurationHours)
                .sum();
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

    public List<ChecklistItemTemplate> getVerificationChecklist() {
        return verificationChecklist;
    }

    public void setVerificationChecklist(List<ChecklistItemTemplate> verificationChecklist) {
        this.verificationChecklist = verificationChecklist;
    }

    public ExternalRefs getExternalRefs() {
        return externalRefs;
    }

    public void setExternalRefs(ExternalRefs externalRefs) {
        this.externalRefs = externalRefs;
    }

    public ProjectTemplate getProjectTemplate() {
        return projectTemplate;
    }

    public void setProjectTemplate(ProjectTemplate projectTemplate) {
        this.projectTemplate = projectTemplate;
    }

    public List<TemplateTask> getTemplateTasks() {
        return templateTasks;
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
        TemplateActivity that = (TemplateActivity) o;
        return Objects.equals(name, that.name) &&
               Objects.equals(projectTemplate, that.projectTemplate) &&
               Objects.equals(displayOrder, that.displayOrder);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, projectTemplate, displayOrder);
    }

    @Override
    public String toString() {
        return "TemplateActivity{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", displayOrder=" + displayOrder +
               ", estimatedDurationHours=" + estimatedDurationHours +
               '}';
    }

    // Inner class for checklist item template
    public static class ChecklistItemTemplate {
        private String description;
        private boolean isRequired;

        protected ChecklistItemTemplate() {
            // Default constructor for JSON serialization
        }

        public ChecklistItemTemplate(String description, boolean isRequired) {
            this.description = description;
            this.isRequired = isRequired;
        }

        // Getters
        public String getDescription() { return description; }
        public boolean isRequired() { return isRequired; }
        
        // Setters
        public void setDescription(String description) { this.description = description; }
        public void setRequired(boolean required) { isRequired = required; }
    }
}