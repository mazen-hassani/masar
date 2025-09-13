package com.salwita.taskmanagement.domain.valueobject;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Column;
import java.util.Objects;

@Embeddable
public class ExternalRefs {
    
    @Column(name = "external_id")
    private String externalId;
    
    @Column(name = "mpp_uid")
    private Integer mppUid;
    
    @Column(name = "source_system")
    private String sourceSystem;

    protected ExternalRefs() {
        // Default constructor for JPA
    }

    public ExternalRefs(String externalId, Integer mppUid, String sourceSystem) {
        this.externalId = externalId;
        this.mppUid = mppUid;
        this.sourceSystem = sourceSystem;
    }

    public static ExternalRefs withExternalId(String externalId) {
        return new ExternalRefs(externalId, null, null);
    }

    public static ExternalRefs withMppUid(Integer mppUid) {
        return new ExternalRefs(null, mppUid, "MSProject");
    }

    // Getters
    public String getExternalId() {
        return externalId;
    }

    public Integer getMppUid() {
        return mppUid;
    }

    public String getSourceSystem() {
        return sourceSystem;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExternalRefs that = (ExternalRefs) o;
        return Objects.equals(externalId, that.externalId) &&
               Objects.equals(mppUid, that.mppUid) &&
               Objects.equals(sourceSystem, that.sourceSystem);
    }

    @Override
    public int hashCode() {
        return Objects.hash(externalId, mppUid, sourceSystem);
    }

    @Override
    public String toString() {
        return "ExternalRefs{" +
               "externalId='" + externalId + '\'' +
               ", mppUid=" + mppUid +
               ", sourceSystem='" + sourceSystem + '\'' +
               '}';
    }
}