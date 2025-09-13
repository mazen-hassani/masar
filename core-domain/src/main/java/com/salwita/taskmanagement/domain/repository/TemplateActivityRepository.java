package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.ProjectTemplate;
import com.salwita.taskmanagement.domain.entity.TemplateActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TemplateActivityRepository extends JpaRepository<TemplateActivity, Long> {

    List<TemplateActivity> findByProjectTemplateOrderByDisplayOrderAsc(ProjectTemplate projectTemplate);

    @Query("SELECT ta FROM TemplateActivity ta LEFT JOIN FETCH ta.templateTasks tt WHERE ta.projectTemplate = :template ORDER BY ta.displayOrder ASC, tt.displayOrder ASC")
    List<TemplateActivity> findByProjectTemplateWithTasks(@Param("template") ProjectTemplate template);

    Optional<TemplateActivity> findByProjectTemplateAndName(ProjectTemplate projectTemplate, String name);

    @Query("SELECT MAX(ta.displayOrder) FROM TemplateActivity ta WHERE ta.projectTemplate = :template")
    Optional<Integer> findMaxDisplayOrderByProjectTemplate(@Param("template") ProjectTemplate template);

    boolean existsByProjectTemplateAndName(ProjectTemplate projectTemplate, String name);

    @Query("SELECT COUNT(ta.templateTasks) FROM TemplateActivity ta WHERE ta.id = :activityId")
    long countTasksByActivityId(@Param("activityId") Long activityId);
}