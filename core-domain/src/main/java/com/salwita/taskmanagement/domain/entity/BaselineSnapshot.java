package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.valueobject.ExternalRefs;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "baseline_snapshots")
@EntityListeners(AuditingEntityListener.class)
public class BaselineSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "item_description", columnDefinition = "TEXT")
    private String itemDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private ItemType itemType;

    @Column(name = "original_item_id", nullable = false)
    private Long originalItemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "baseline_status", nullable = false)
    private Status baselineStatus;

    @Column(name = "baseline_start_date")
    private LocalDateTime baselineStartDate;

    @Column(name = "baseline_end_date")
    private LocalDateTime baselineEndDate;

    @Column(name = "baseline_percentage_complete", nullable = false)
    private Integer baselinePercentageComplete = 0;

    @Embedded
    private ExternalRefs externalRefs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "baseline_id", nullable = false)
    @NotNull
    private ProjectBaseline baseline;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected BaselineSnapshot() {
        // Default constructor for JPA
    }

    // Constructor for Activity snapshot
    public BaselineSnapshot(Activity activity, ProjectBaseline baseline) {
        this.itemName = activity.getName();
        this.itemDescription = activity.getDescription();
        this.itemType = ItemType.ACTIVITY;
        this.originalItemId = activity.getId();
        this.baselineStatus = activity.getStatus();
        this.baselineStartDate = activity.getStartDate();
        this.baselineEndDate = activity.getEndDate();
        this.baselinePercentageComplete = activity.getPercentageComplete();
        this.externalRefs = activity.getExternalRefs();
        this.baseline = baseline;
    }

    // Constructor for Task snapshot
    public BaselineSnapshot(Task task, ProjectBaseline baseline) {
        this.itemName = task.getName();
        this.itemDescription = task.getDescription();
        this.itemType = ItemType.TASK;
        this.originalItemId = task.getId();
        this.baselineStatus = task.getStatus();
        this.baselineStartDate = task.getStartDate();
        this.baselineEndDate = task.getEndDate();
        this.baselinePercentageComplete = task.getPercentageComplete();
        this.externalRefs = task.getExternalRefs();
        this.baseline = baseline;
    }

    // Constructor for Project snapshot
    public BaselineSnapshot(Project project, ProjectBaseline baseline) {
        this.itemName = project.getName();
        this.itemDescription = project.getDescription();
        this.itemType = ItemType.PROJECT;
        this.originalItemId = project.getId();
        this.baselineStatus = project.getStatus();
        this.baselineStartDate = project.getStartDate();
        this.baselineEndDate = project.getEndDate();
        this.baselinePercentageComplete = project.getPercentageComplete();
        this.externalRefs = project.getExternalRefs();
        this.baseline = baseline;
    }

    // Business methods
    public boolean isActivity() {
        return itemType == ItemType.ACTIVITY;
    }

    public boolean isTask() {
        return itemType == ItemType.TASK;
    }

    public boolean isProject() {
        return itemType == ItemType.PROJECT;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getItemDescription() {
        return itemDescription;
    }

    public void setItemDescription(String itemDescription) {
        this.itemDescription = itemDescription;
    }

    public ItemType getItemType() {
        return itemType;
    }

    public void setItemType(ItemType itemType) {
        this.itemType = itemType;
    }

    public Long getOriginalItemId() {
        return originalItemId;
    }

    public void setOriginalItemId(Long originalItemId) {
        this.originalItemId = originalItemId;
    }

    public Status getBaselineStatus() {
        return baselineStatus;
    }

    public void setBaselineStatus(Status baselineStatus) {
        this.baselineStatus = baselineStatus;
    }

    public LocalDateTime getBaselineStartDate() {
        return baselineStartDate;
    }

    public void setBaselineStartDate(LocalDateTime baselineStartDate) {
        this.baselineStartDate = baselineStartDate;
    }

    public LocalDateTime getBaselineEndDate() {
        return baselineEndDate;
    }

    public void setBaselineEndDate(LocalDateTime baselineEndDate) {
        this.baselineEndDate = baselineEndDate;
    }

    public Integer getBaselinePercentageComplete() {
        return baselinePercentageComplete;
    }

    public void setBaselinePercentageComplete(Integer baselinePercentageComplete) {
        this.baselinePercentageComplete = baselinePercentageComplete;
    }

    public ExternalRefs getExternalRefs() {
        return externalRefs;
    }

    public void setExternalRefs(ExternalRefs externalRefs) {
        this.externalRefs = externalRefs;
    }

    public ProjectBaseline getBaseline() {
        return baseline;
    }

    public void setBaseline(ProjectBaseline baseline) {
        this.baseline = baseline;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BaselineSnapshot that = (BaselineSnapshot) o;
        return Objects.equals(id, that.id) && 
               Objects.equals(originalItemId, that.originalItemId) && 
               itemType == that.itemType;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, originalItemId, itemType);
    }

    @Override
    public String toString() {
        return "BaselineSnapshot{" +
               "id=" + id +
               ", itemName='" + itemName + '\'' +
               ", itemType=" + itemType +
               ", originalItemId=" + originalItemId +
               ", baselineStatus=" + baselineStatus +
               ", baselineStartDate=" + baselineStartDate +
               ", baselineEndDate=" + baselineEndDate +
               '}';
    }

    public enum ItemType {
        PROJECT,
        ACTIVITY,
        TASK
    }
}