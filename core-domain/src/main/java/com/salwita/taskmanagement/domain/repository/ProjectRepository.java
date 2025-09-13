package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.Project;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.projection.ProjectDashboardData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByOrganisationId(Long organisationId);

    List<Project> findByAssignedPmUserId(Long userId);

    @Query("SELECT p FROM Project p WHERE p.organisation.id = :organisationId AND p.assignedPmUser.id = :userId")
    List<Project> findByOrganisationIdAndAssignedPmUserId(@Param("organisationId") Long organisationId, 
                                                           @Param("userId") Long userId);

    List<Project> findByStatus(Status status);

    List<Project> findByTrackingStatus(TrackingStatus trackingStatus);

    @Query("SELECT p FROM Project p WHERE p.organisation.id = :organisationId AND p.status = :status")
    List<Project> findByOrganisationIdAndStatus(@Param("organisationId") Long organisationId, 
                                                 @Param("status") Status status);

    @Query("SELECT p FROM Project p WHERE p.organisation.id = :organisationId AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Project> findByOrganisationIdAndSearchTerm(@Param("organisationId") Long organisationId, 
                                                     @Param("searchTerm") String searchTerm, 
                                                     Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.endDate < :currentDate AND p.status NOT IN ('COMPLETED', 'VERIFIED')")
    List<Project> findOverdueProjects(@Param("currentDate") LocalDateTime currentDate);

    @Query("SELECT p FROM Project p WHERE p.organisation.id = :organisationId ORDER BY p.createdAt DESC")
    Page<Project> findByOrganisationIdOrderByCreatedAtDesc(@Param("organisationId") Long organisationId, 
                                                            Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.startDate BETWEEN :startDate AND :endDate")
    List<Project> findProjectsStartingBetween(@Param("startDate") LocalDateTime startDate, 
                                               @Param("endDate") LocalDateTime endDate);

    @Query("SELECT p FROM Project p WHERE p.endDate BETWEEN :startDate AND :endDate")
    List<Project> findProjectsEndingBetween(@Param("startDate") LocalDateTime startDate, 
                                             @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(p) FROM Project p WHERE p.organisation.id = :organisationId")
    long countByOrganisationId(@Param("organisationId") Long organisationId);

    @Query("SELECT COUNT(p) FROM Project p WHERE p.organisation.id = :organisationId AND p.status = :status")
    long countByOrganisationIdAndStatus(@Param("organisationId") Long organisationId, @Param("status") Status status);

    Optional<Project> findByExternalRefs_ExternalId(String externalId);

    Optional<Project> findByExternalRefs_MppUid(Integer mppUid);

    boolean existsByName(String name);

    @Query("SELECT p FROM Project p WHERE p.organisation.id = :organisationId AND p.name = :name")
    Optional<Project> findByOrganisationIdAndName(@Param("organisationId") Long organisationId, 
                                                   @Param("name") String name);

    // Dashboard projection queries
    @Query("""
        SELECT p.id as id, p.name as name, p.description as description, 
               p.status as status, p.trackingStatus as trackingStatus, 
               p.percentageComplete as percentageComplete,
               p.startDate as startDate, p.endDate as endDate,
               CONCAT(u.firstName, ' ', u.lastName) as assignedPmUserName,
               COUNT(DISTINCT a.id) as totalActivities,
               (SELECT COUNT(DISTINCT t.id) FROM Task t WHERE t.activity.project.id = p.id) as totalTasks,
               COUNT(DISTINCT CASE WHEN a.status IN ('COMPLETED', 'VERIFIED') THEN a.id END) as completedActivities,
               (SELECT COUNT(DISTINCT t.id) FROM Task t WHERE t.activity.project.id = p.id AND t.status IN ('COMPLETED', 'VERIFIED')) as completedTasks,
               COUNT(DISTINCT CASE WHEN a.trackingStatus = 'ON_TRACK' THEN a.id END) as onTrackItems,
               COUNT(DISTINCT CASE WHEN a.trackingStatus = 'AT_RISK' THEN a.id END) as atRiskItems,
               COUNT(DISTINCT CASE WHEN a.trackingStatus = 'OFF_TRACK' THEN a.id END) as offTrackItems,
               COUNT(DISTINCT CASE WHEN a.endDate < CURRENT_TIMESTAMP AND a.status NOT IN ('COMPLETED', 'VERIFIED') THEN a.id END) as overdueItems
        FROM Project p 
        LEFT JOIN p.assignedPmUser u
        LEFT JOIN p.activities a
        WHERE p.id = :projectId
        GROUP BY p.id, p.name, p.description, p.status, p.trackingStatus, 
                 p.percentageComplete, p.startDate, p.endDate, u.firstName, u.lastName
        """)
    ProjectDashboardData findProjectDashboardData(@Param("projectId") Long projectId);
}