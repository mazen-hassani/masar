package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.ProjectTemplate;
import com.salwita.taskmanagement.domain.entity.TemplateDependency;
import com.salwita.taskmanagement.domain.entity.TemplateActivity;
import com.salwita.taskmanagement.domain.entity.TemplateTask;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TemplateDependencyRepository extends JpaRepository<TemplateDependency, Long> {

    List<TemplateDependency> findByProjectTemplate(ProjectTemplate projectTemplate);

    List<TemplateDependency> findByProjectTemplateAndDependencyType(ProjectTemplate projectTemplate, DependencyType dependencyType);

    // Activity-level dependency queries
    List<TemplateDependency> findByPredecessorTemplateActivity(TemplateActivity predecessorActivity);

    List<TemplateDependency> findBySuccessorTemplateActivity(TemplateActivity successorActivity);

    @Query("SELECT td FROM TemplateDependency td WHERE td.predecessorTemplateActivity = :activity OR td.successorTemplateActivity = :activity")
    List<TemplateDependency> findByTemplateActivity(@Param("activity") TemplateActivity activity);

    // Task-level dependency queries
    List<TemplateDependency> findByPredecessorTemplateTask(TemplateTask predecessorTask);

    List<TemplateDependency> findBySuccessorTemplateTask(TemplateTask successorTask);

    @Query("SELECT td FROM TemplateDependency td WHERE td.predecessorTemplateTask = :task OR td.successorTemplateTask = :task")
    List<TemplateDependency> findByTemplateTask(@Param("task") TemplateTask task);

    // Cycle detection queries
    @Query("SELECT td FROM TemplateDependency td WHERE td.projectTemplate = :template AND " +
           "(td.predecessorTemplateActivity IS NOT NULL OR td.predecessorTemplateTask IS NOT NULL)")
    List<TemplateDependency> findAllDependenciesForCycleDetection(@Param("template") ProjectTemplate template);

    // Dependency validation queries
    boolean existsByPredecessorTemplateActivityAndSuccessorTemplateActivity(
        TemplateActivity predecessorActivity, TemplateActivity successorActivity);

    boolean existsByPredecessorTemplateTaskAndSuccessorTemplateTask(
        TemplateTask predecessorTask, TemplateTask successorTask);

    @Query("SELECT COUNT(td) FROM TemplateDependency td WHERE td.projectTemplate = :template AND td.predecessorTemplateActivity IS NOT NULL")
    long countActivityDependencies(@Param("template") ProjectTemplate template);

    @Query("SELECT COUNT(td) FROM TemplateDependency td WHERE td.projectTemplate = :template AND td.predecessorTemplateTask IS NOT NULL")
    long countTaskDependencies(@Param("template") ProjectTemplate template);
}