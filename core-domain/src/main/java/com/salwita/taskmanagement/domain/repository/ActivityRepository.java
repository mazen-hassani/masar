package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.Activity;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
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
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByProjectId(Long projectId);

    @Query("SELECT a FROM Activity a WHERE a.project.id = :projectId ORDER BY a.startDate ASC")
    List<Activity> findByProjectIdOrderByStartDate(@Param("projectId") Long projectId);

    List<Activity> findByStatus(Status status);

    List<Activity> findByTrackingStatus(TrackingStatus trackingStatus);

    @Query("SELECT a FROM Activity a WHERE a.project.id = :projectId AND a.status = :status")
    List<Activity> findByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") Status status);

    @Query("SELECT a FROM Activity a WHERE a.project.id = :projectId AND a.trackingStatus = :trackingStatus")
    List<Activity> findByProjectIdAndTrackingStatus(@Param("projectId") Long projectId, 
                                                     @Param("trackingStatus") TrackingStatus trackingStatus);

    @Query("SELECT a FROM Activity a WHERE a.status = :status AND a.trackingStatus = :trackingStatus")
    List<Activity> findByStatusAndTrackingStatus(@Param("status") Status status, 
                                                  @Param("trackingStatus") TrackingStatus trackingStatus);

    @Query("SELECT a FROM Activity a WHERE a.project.id = :projectId AND " +
           "(LOWER(a.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Activity> findByProjectIdAndSearchTerm(@Param("projectId") Long projectId, 
                                                 @Param("searchTerm") String searchTerm, 
                                                 Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.endDate < :currentDate AND a.status NOT IN ('COMPLETED', 'VERIFIED')")
    List<Activity> findOverdueActivities(@Param("currentDate") LocalDateTime currentDate);

    @Query("SELECT a FROM Activity a WHERE a.project.id = :projectId AND a.endDate < :currentDate AND a.status NOT IN ('COMPLETED', 'VERIFIED')")
    List<Activity> findOverdueActivitiesByProjectId(@Param("projectId") Long projectId, 
                                                     @Param("currentDate") LocalDateTime currentDate);

    @Query("SELECT a FROM Activity a WHERE a.startDate BETWEEN :startDate AND :endDate")
    List<Activity> findActivitiesStartingBetween(@Param("startDate") LocalDateTime startDate, 
                                                  @Param("endDate") LocalDateTime endDate);

    @Query("SELECT a FROM Activity a WHERE a.endDate BETWEEN :startDate AND :endDate")
    List<Activity> findActivitiesEndingBetween(@Param("startDate") LocalDateTime startDate, 
                                                @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.project.id = :projectId")
    long countByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.project.id = :projectId AND a.status = :status")
    long countByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") Status status);

    @Query("SELECT AVG(a.percentageComplete) FROM Activity a WHERE a.project.id = :projectId")
    Double getAverageProgressByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT a FROM Activity a WHERE a.project.id = :projectId AND a.status = 'COMPLETED' AND " +
           "SIZE(a.verificationChecklist) > 0 AND " +
           "NOT EXISTS (SELECT 1 FROM Activity.ChecklistItem ci WHERE ci MEMBER OF a.verificationChecklist AND ci.completed = false)")
    List<Activity> findCompletedActivitiesReadyForVerification(@Param("projectId") Long projectId);

    Optional<Activity> findByExternalRefs_ExternalId(String externalId);

    Optional<Activity> findByExternalRefs_MppUid(Integer mppUid);

    @Query("SELECT a FROM Activity a WHERE a.project.id = :projectId AND a.name = :name")
    Optional<Activity> findByProjectIdAndName(@Param("projectId") Long projectId, @Param("name") String name);

    @Query("SELECT a FROM Activity a WHERE a.project.organisation.id = :organisationId")
    List<Activity> findByOrganisationId(@Param("organisationId") Long organisationId);
}