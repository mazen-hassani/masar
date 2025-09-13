package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.Dependency;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DependencyRepository extends JpaRepository<Dependency, Long> {

    // Activity dependency queries
    List<Dependency> findByPredecessorActivityId(Long activityId);

    List<Dependency> findBySuccessorActivityId(Long activityId);

    @Query("SELECT d FROM Dependency d WHERE d.predecessorActivity.id = :activityId OR d.successorActivity.id = :activityId")
    List<Dependency> findAllByActivityId(@Param("activityId") Long activityId);

    // Task dependency queries
    List<Dependency> findByPredecessorTaskId(Long taskId);

    List<Dependency> findBySuccessorTaskId(Long taskId);

    @Query("SELECT d FROM Dependency d WHERE d.predecessorTask.id = :taskId OR d.successorTask.id = :taskId")
    List<Dependency> findAllByTaskId(@Param("taskId") Long taskId);

    // Project-level dependency queries
    @Query("SELECT d FROM Dependency d WHERE " +
           "(d.predecessorActivity.project.id = :projectId) OR " +
           "(d.successorActivity.project.id = :projectId) OR " +
           "(d.predecessorTask.activity.project.id = :projectId) OR " +
           "(d.successorTask.activity.project.id = :projectId)")
    List<Dependency> findByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT d FROM Dependency d WHERE d.dependencyType = :dependencyType")
    List<Dependency> findByDependencyType(@Param("dependencyType") DependencyType dependencyType);

    // Predecessor queries (for scheduling)
    @Query("SELECT d FROM Dependency d WHERE d.successorActivity.id = :activityId")
    List<Dependency> findPredecessorsForActivity(@Param("activityId") Long activityId);

    @Query("SELECT d FROM Dependency d WHERE d.successorTask.id = :taskId")
    List<Dependency> findPredecessorsForTask(@Param("taskId") Long taskId);

    // Successor queries (for impact analysis)
    @Query("SELECT d FROM Dependency d WHERE d.predecessorActivity.id = :activityId")
    List<Dependency> findSuccessorsForActivity(@Param("activityId") Long activityId);

    @Query("SELECT d FROM Dependency d WHERE d.predecessorTask.id = :taskId")
    List<Dependency> findSuccessorsForTask(@Param("taskId") Long taskId);

    // Recursive predecessor/successor queries for complex dependency chains
    @Query(value = """
        WITH RECURSIVE activity_predecessors AS (
            SELECT id, predecessor_activity_id, successor_activity_id, dependency_type, lag_in_minutes, 0 as depth
            FROM dependencies 
            WHERE successor_activity_id = :activityId
            UNION ALL
            SELECT d.id, d.predecessor_activity_id, d.successor_activity_id, d.dependency_type, d.lag_in_minutes, ap.depth + 1
            FROM dependencies d
            INNER JOIN activity_predecessors ap ON d.successor_activity_id = ap.predecessor_activity_id
            WHERE ap.depth < 10
        )
        SELECT d.* FROM dependencies d 
        INNER JOIN activity_predecessors ap ON d.id = ap.id
        """, nativeQuery = true)
    List<Dependency> findAllPredecessorsForActivity(@Param("activityId") Long activityId);

    @Query(value = """
        WITH RECURSIVE activity_successors AS (
            SELECT id, predecessor_activity_id, successor_activity_id, dependency_type, lag_in_minutes, 0 as depth
            FROM dependencies 
            WHERE predecessor_activity_id = :activityId
            UNION ALL
            SELECT d.id, d.predecessor_activity_id, d.successor_activity_id, d.dependency_type, d.lag_in_minutes, as_.depth + 1
            FROM dependencies d
            INNER JOIN activity_successors as_ ON d.predecessor_activity_id = as_.successor_activity_id
            WHERE as_.depth < 10
        )
        SELECT d.* FROM dependencies d 
        INNER JOIN activity_successors as_ ON d.id = as_.id
        """, nativeQuery = true)
    List<Dependency> findAllSuccessorsForActivity(@Param("activityId") Long activityId);

    // Similar recursive queries for tasks
    @Query(value = """
        WITH RECURSIVE task_predecessors AS (
            SELECT id, predecessor_task_id, successor_task_id, dependency_type, lag_in_minutes, 0 as depth
            FROM dependencies 
            WHERE successor_task_id = :taskId
            UNION ALL
            SELECT d.id, d.predecessor_task_id, d.successor_task_id, d.dependency_type, d.lag_in_minutes, tp.depth + 1
            FROM dependencies d
            INNER JOIN task_predecessors tp ON d.successor_task_id = tp.predecessor_task_id
            WHERE tp.depth < 10
        )
        SELECT d.* FROM dependencies d 
        INNER JOIN task_predecessors tp ON d.id = tp.id
        """, nativeQuery = true)
    List<Dependency> findAllPredecessorsForTask(@Param("taskId") Long taskId);

    @Query(value = """
        WITH RECURSIVE task_successors AS (
            SELECT id, predecessor_task_id, successor_task_id, dependency_type, lag_in_minutes, 0 as depth
            FROM dependencies 
            WHERE predecessor_task_id = :taskId
            UNION ALL
            SELECT d.id, d.predecessor_task_id, d.successor_task_id, d.dependency_type, d.lag_in_minutes, ts.depth + 1
            FROM dependencies d
            INNER JOIN task_successors ts ON d.predecessor_task_id = ts.successor_task_id
            WHERE ts.depth < 10
        )
        SELECT d.* FROM dependencies d 
        INNER JOIN task_successors ts ON d.id = ts.id
        """, nativeQuery = true)
    List<Dependency> findAllSuccessorsForTask(@Param("taskId") Long taskId);

    // Cycle detection queries
    @Query(value = """
        WITH RECURSIVE cycle_check AS (
            SELECT predecessor_activity_id as start_id, successor_activity_id as current_id, 
                   ARRAY[predecessor_activity_id] as path, 0 as depth
            FROM dependencies 
            WHERE predecessor_activity_id = :startActivityId
            UNION ALL
            SELECT cc.start_id, d.successor_activity_id, cc.path || d.predecessor_activity_id, cc.depth + 1
            FROM dependencies d
            INNER JOIN cycle_check cc ON d.predecessor_activity_id = cc.current_id
            WHERE cc.depth < 20 AND NOT (d.predecessor_activity_id = ANY(cc.path))
        )
        SELECT CASE WHEN EXISTS(SELECT 1 FROM cycle_check WHERE current_id = start_id) THEN TRUE ELSE FALSE END
        """, nativeQuery = true)
    Boolean detectActivityCycle(@Param("startActivityId") Long startActivityId);

    @Query(value = """
        WITH RECURSIVE cycle_check AS (
            SELECT predecessor_task_id as start_id, successor_task_id as current_id, 
                   ARRAY[predecessor_task_id] as path, 0 as depth
            FROM dependencies 
            WHERE predecessor_task_id = :startTaskId
            UNION ALL
            SELECT cc.start_id, d.successor_task_id, cc.path || d.predecessor_task_id, cc.depth + 1
            FROM dependencies d
            INNER JOIN cycle_check cc ON d.predecessor_task_id = cc.current_id
            WHERE cc.depth < 20 AND NOT (d.predecessor_task_id = ANY(cc.path))
        )
        SELECT CASE WHEN EXISTS(SELECT 1 FROM cycle_check WHERE current_id = start_id) THEN TRUE ELSE FALSE END
        """, nativeQuery = true)
    Boolean detectTaskCycle(@Param("startTaskId") Long startTaskId);

    // Check for duplicate dependencies
    @Query("SELECT d FROM Dependency d WHERE " +
           "d.predecessorActivity.id = :predecessorActivityId AND " +
           "d.successorActivity.id = :successorActivityId")
    Optional<Dependency> findExistingActivityDependency(@Param("predecessorActivityId") Long predecessorActivityId,
                                                         @Param("successorActivityId") Long successorActivityId);

    @Query("SELECT d FROM Dependency d WHERE " +
           "d.predecessorTask.id = :predecessorTaskId AND " +
           "d.successorTask.id = :successorTaskId")
    Optional<Dependency> findExistingTaskDependency(@Param("predecessorTaskId") Long predecessorTaskId,
                                                     @Param("successorTaskId") Long successorTaskId);

    // Count queries
    @Query("SELECT COUNT(d) FROM Dependency d WHERE " +
           "(d.predecessorActivity.project.id = :projectId) OR " +
           "(d.successorActivity.project.id = :projectId) OR " +
           "(d.predecessorTask.activity.project.id = :projectId) OR " +
           "(d.successorTask.activity.project.id = :projectId)")
    long countByProjectId(@Param("projectId") Long projectId);

    // Find items with no dependencies (potential starting points)
    @Query("SELECT a.id FROM Activity a WHERE a.project.id = :projectId AND " +
           "NOT EXISTS (SELECT 1 FROM Dependency d WHERE d.successorActivity.id = a.id)")
    List<Long> findActivitiesWithNoPredecessors(@Param("projectId") Long projectId);

    @Query("SELECT t.id FROM Task t WHERE t.activity.project.id = :projectId AND " +
           "NOT EXISTS (SELECT 1 FROM Dependency d WHERE d.successorTask.id = t.id)")
    List<Long> findTasksWithNoPredecessors(@Param("projectId") Long projectId);
}