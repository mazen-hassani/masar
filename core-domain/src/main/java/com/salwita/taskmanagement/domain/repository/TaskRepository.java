package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.Task;
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
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByActivityId(Long activityId);

    List<Task> findByAssigneeUserId(Long userId);

    @Query("SELECT t FROM Task t WHERE t.activity.id = :activityId ORDER BY t.startDate ASC")
    List<Task> findByActivityIdOrderByStartDate(@Param("activityId") Long activityId);

    @Query("SELECT t FROM Task t WHERE t.assigneeUser.id = :userId AND t.status IN :statuses")
    List<Task> findByAssigneeUserIdAndStatusIn(@Param("userId") Long userId, @Param("statuses") List<Status> statuses);

    @Query("SELECT t FROM Task t WHERE t.assigneeUser.id = :userId AND t.status = :status")
    List<Task> findByAssigneeUserIdAndStatus(@Param("userId") Long userId, @Param("status") Status status);

    List<Task> findByStatus(Status status);

    List<Task> findByTrackingStatus(TrackingStatus trackingStatus);

    @Query("SELECT t FROM Task t WHERE t.activity.project.id = :projectId")
    List<Task> findByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT t FROM Task t WHERE t.activity.project.id = :projectId AND t.status = :status")
    List<Task> findByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") Status status);

    @Query("SELECT t FROM Task t WHERE t.activity.project.id = :projectId AND t.assigneeUser.id = :userId")
    List<Task> findByProjectIdAndAssigneeUserId(@Param("projectId") Long projectId, @Param("userId") Long userId);

    @Query("SELECT t FROM Task t WHERE t.endDate < :currentDate AND t.status NOT IN ('COMPLETED', 'VERIFIED')")
    List<Task> findOverdueTasks(@Param("currentDate") LocalDateTime currentDate);

    @Query("SELECT t FROM Task t WHERE t.assigneeUser.id = :userId AND t.endDate < :currentDate AND t.status NOT IN ('COMPLETED', 'VERIFIED')")
    List<Task> findOverdueTasksByAssigneeUserId(@Param("userId") Long userId, @Param("currentDate") LocalDateTime currentDate);

    @Query("SELECT t FROM Task t WHERE t.activity.project.id = :projectId AND t.endDate < :currentDate AND t.status NOT IN ('COMPLETED', 'VERIFIED')")
    List<Task> findOverdueTasksByProjectId(@Param("projectId") Long projectId, @Param("currentDate") LocalDateTime currentDate);

    @Query("SELECT t FROM Task t WHERE t.activity.id = :activityId AND " +
           "(LOWER(t.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Task> findByActivityIdAndSearchTerm(@Param("activityId") Long activityId, 
                                             @Param("searchTerm") String searchTerm, 
                                             Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.assigneeUser.id = :userId AND " +
           "(LOWER(t.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Task> findByAssigneeUserIdAndSearchTerm(@Param("userId") Long userId, 
                                                  @Param("searchTerm") String searchTerm, 
                                                  Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.startDate BETWEEN :startDate AND :endDate")
    List<Task> findTasksStartingBetween(@Param("startDate") LocalDateTime startDate, 
                                        @Param("endDate") LocalDateTime endDate);

    @Query("SELECT t FROM Task t WHERE t.endDate BETWEEN :startDate AND :endDate")
    List<Task> findTasksEndingBetween(@Param("startDate") LocalDateTime startDate, 
                                      @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.activity.id = :activityId")
    long countByActivityId(@Param("activityId") Long activityId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.activity.id = :activityId AND t.status = :status")
    long countByActivityIdAndStatus(@Param("activityId") Long activityId, @Param("status") Status status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.assigneeUser.id = :userId")
    long countByAssigneeUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.assigneeUser.id = :userId AND t.status = :status")
    long countByAssigneeUserIdAndStatus(@Param("userId") Long userId, @Param("status") Status status);

    @Query("SELECT AVG(t.percentageComplete) FROM Task t WHERE t.activity.id = :activityId")
    Double getAverageProgressByActivityId(@Param("activityId") Long activityId);

    @Query("SELECT t FROM Task t WHERE t.status = 'COMPLETED' AND t.verifiedAt IS NULL")
    List<Task> findCompletedTasksAwaitingVerification();

    @Query("SELECT t FROM Task t WHERE t.activity.project.id = :projectId AND t.status = 'COMPLETED' AND t.verifiedAt IS NULL")
    List<Task> findCompletedTasksAwaitingVerificationByProjectId(@Param("projectId") Long projectId);

    Optional<Task> findByExternalRefs_ExternalId(String externalId);

    Optional<Task> findByExternalRefs_MppUid(Integer mppUid);

    @Query("SELECT t FROM Task t WHERE t.activity.id = :activityId AND t.name = :name")
    Optional<Task> findByActivityIdAndName(@Param("activityId") Long activityId, @Param("name") String name);

    @Query("SELECT t FROM Task t WHERE t.activity.project.organisation.id = :organisationId")
    List<Task> findByOrganisationId(@Param("organisationId") Long organisationId);

    @Query("SELECT DISTINCT t.assigneeUser FROM Task t WHERE t.activity.project.id = :projectId AND t.assigneeUser IS NOT NULL")
    List<Object> findDistinctAssigneesByProjectId(@Param("projectId") Long projectId);
}