package com.salwita.taskmanagement.domain.builder;

import com.salwita.taskmanagement.domain.entity.Organisation;
import com.salwita.taskmanagement.domain.entity.User;
import com.salwita.taskmanagement.domain.enums.Role;

public class UserTestBuilder {
    
    private String email = "test@example.com";
    private String firstName = "John";
    private String lastName = "Doe";
    private String passwordHash = "$2a$10$encrypted.password.hash";
    private Role role = Role.TEAM_MEMBER;
    private Organisation organisation = OrganisationTestBuilder.organisation().build();

    public static UserTestBuilder user() {
        return new UserTestBuilder();
    }

    public UserTestBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    public UserTestBuilder withName(String firstName, String lastName) {
        this.firstName = firstName;
        this.lastName = lastName;
        return this;
    }

    public UserTestBuilder withRole(Role role) {
        this.role = role;
        return this;
    }

    public UserTestBuilder withOrganisation(Organisation organisation) {
        this.organisation = organisation;
        return this;
    }

    public UserTestBuilder withPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
        return this;
    }

    public User build() {
        return new User(email, firstName, lastName, passwordHash, role, organisation);
    }
}