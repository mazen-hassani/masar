package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.Organisation;
import com.salwita.taskmanagement.domain.entity.ProjectTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectTemplateRepository extends JpaRepository<ProjectTemplate, Long> {

    List<ProjectTemplate> findByOrganisationAndIsActiveTrue(Organisation organisation);

    List<ProjectTemplate> findByOrganisation(Organisation organisation);

    Optional<ProjectTemplate> findByNameAndOrganisationAndIsActiveTrue(String name, Organisation organisation);

    @Query("SELECT pt FROM ProjectTemplate pt WHERE pt.name = :name AND pt.organisation = :organisation ORDER BY pt.version DESC")
    List<ProjectTemplate> findByNameAndOrganisationOrderByVersionDesc(@Param("name") String name, @Param("organisation") Organisation organisation);

    @Query("SELECT pt FROM ProjectTemplate pt WHERE pt.organisation = :organisation AND pt.isActive = true ORDER BY pt.name ASC")
    List<ProjectTemplate> findActiveTemplatesByOrganisation(@Param("organisation") Organisation organisation);

    @Query("SELECT pt FROM ProjectTemplate pt WHERE pt.organisation = :organisation AND pt.createdByUser.id = :userId ORDER BY pt.updatedAt DESC")
    List<ProjectTemplate> findByOrganisationAndCreatedByUser(@Param("organisation") Organisation organisation, @Param("userId") Long userId);

    boolean existsByNameAndOrganisation(String name, Organisation organisation);

    @Query("SELECT COUNT(p) FROM Project p WHERE p.sourceTemplate = :template")
    long countProjectsCreatedFromTemplate(@Param("template") ProjectTemplate template);

    @Query("SELECT pt FROM ProjectTemplate pt LEFT JOIN FETCH pt.templateActivities ta LEFT JOIN FETCH ta.templateTasks WHERE pt.id = :id")
    Optional<ProjectTemplate> findByIdWithActivitiesAndTasks(@Param("id") Long id);

    @Query("SELECT pt FROM ProjectTemplate pt LEFT JOIN FETCH pt.templateDependencies WHERE pt.id = :id")
    Optional<ProjectTemplate> findByIdWithDependencies(@Param("id") Long id);
}