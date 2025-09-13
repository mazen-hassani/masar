package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.config.TestConfiguration;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureTestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

@DataJpaTest(properties = {
    "spring.liquibase.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureTestEntityManager
@ContextConfiguration(classes = TestConfiguration.class)
@ActiveProfiles("test")
public abstract class BaseRepositoryTest {
}