package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.BaselineSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BaselineSnapshotRepository extends JpaRepository<BaselineSnapshot, Long> {

    List<BaselineSnapshot> findByBaselineId(Long baselineId);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.baseline.id = :baselineId AND bs.itemType = :itemType")
    List<BaselineSnapshot> findByBaselineIdAndItemType(@Param("baselineId") Long baselineId, 
                                                        @Param("itemType") BaselineSnapshot.ItemType itemType);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.baseline.id = :baselineId AND bs.originalItemId = :originalItemId AND bs.itemType = :itemType")
    Optional<BaselineSnapshot> findByBaselineIdAndOriginalItemIdAndItemType(@Param("baselineId") Long baselineId,
                                                                             @Param("originalItemId") Long originalItemId,
                                                                             @Param("itemType") BaselineSnapshot.ItemType itemType);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.originalItemId = :originalItemId AND bs.itemType = :itemType")
    List<BaselineSnapshot> findByOriginalItemIdAndItemType(@Param("originalItemId") Long originalItemId,
                                                            @Param("itemType") BaselineSnapshot.ItemType itemType);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.baseline.project.id = :projectId")
    List<BaselineSnapshot> findByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.baseline.project.id = :projectId AND bs.itemType = :itemType")
    List<BaselineSnapshot> findByProjectIdAndItemType(@Param("projectId") Long projectId,
                                                       @Param("itemType") BaselineSnapshot.ItemType itemType);

    @Query("SELECT COUNT(bs) FROM BaselineSnapshot bs WHERE bs.baseline.id = :baselineId")
    long countByBaselineId(@Param("baselineId") Long baselineId);

    @Query("SELECT COUNT(bs) FROM BaselineSnapshot bs WHERE bs.baseline.id = :baselineId AND bs.itemType = :itemType")
    long countByBaselineIdAndItemType(@Param("baselineId") Long baselineId, @Param("itemType") BaselineSnapshot.ItemType itemType);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.externalRefs.externalId = :externalId")
    List<BaselineSnapshot> findByExternalId(@Param("externalId") String externalId);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.externalRefs.mppUid = :mppUid")
    List<BaselineSnapshot> findByMppUid(@Param("mppUid") Integer mppUid);

    @Query("SELECT bs FROM BaselineSnapshot bs WHERE bs.baseline.project.organisation.id = :organisationId")
    List<BaselineSnapshot> findByOrganisationId(@Param("organisationId") Long organisationId);
}