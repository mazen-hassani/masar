package com.salwita.taskmanagement.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "holidays")
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date", nullable = false, unique = true)
    private LocalDate date;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "is_recurring", nullable = false)
    private Boolean isRecurring = false;

    protected Holiday() {
    }

    private Holiday(Builder builder) {
        this.date = builder.date;
        this.name = builder.name;
        this.description = builder.description;
        this.isRecurring = builder.isRecurring;
    }

    public static Builder builder() {
        return new Builder();
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Boolean getIsRecurring() {
        return isRecurring;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Holiday holiday = (Holiday) o;
        return Objects.equals(date, holiday.date) &&
               Objects.equals(name, holiday.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(date, name);
    }

    @Override
    public String toString() {
        return "Holiday{" +
               "id=" + id +
               ", date=" + date +
               ", name='" + name + '\'' +
               ", description='" + description + '\'' +
               ", isRecurring=" + isRecurring +
               '}';
    }

    public static class Builder {
        private LocalDate date;
        private String name;
        private String description;
        private Boolean isRecurring = false;

        private Builder() {
        }

        public Builder date(LocalDate date) {
            this.date = date;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }

        public Builder isRecurring(Boolean isRecurring) {
            this.isRecurring = isRecurring;
            return this;
        }

        public Holiday build() {
            Objects.requireNonNull(date, "Date is required");
            Objects.requireNonNull(name, "Name is required");
            return new Holiday(this);
        }
    }
}