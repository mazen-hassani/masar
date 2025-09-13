package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.TemplateActivity;
import com.salwita.taskmanagement.domain.entity.TemplateTask;
import com.salwita.taskmanagement.domain.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TemplateTaskRepository extends JpaRepository<TemplateTask, Long> {

    List<TemplateTask> findByTemplateActivityOrderByDisplayOrderAsc(TemplateActivity templateActivity);

    Optional<TemplateTask> findByTemplateActivityAndName(TemplateActivity templateActivity, String name);

    @Query("SELECT MAX(tt.displayOrder) FROM TemplateTask tt WHERE tt.templateActivity = :activity")
    Optional<Integer> findMaxDisplayOrderByTemplateActivity(@Param("activity") TemplateActivity activity);

    boolean existsByTemplateActivityAndName(TemplateActivity templateActivity, String name);

    List<TemplateTask> findByRequiredAssigneeRole(Role role);

    @Query("SELECT tt FROM TemplateTask tt WHERE tt.templateActivity.projectTemplate.id = :templateId AND tt.requiredAssigneeRole = :role")
    List<TemplateTask> findByProjectTemplateIdAndRole(@Param("templateId") Long templateId, @Param("role") Role role);

    @Query("SELECT SUM(tt.estimatedDurationHours) FROM TemplateTask tt WHERE tt.templateActivity = :activity")
    Optional<Integer> sumEstimatedHoursByActivity(@Param("activity") TemplateActivity activity);
}