package com.salwita.taskmanagement.domain.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan("com.salwita.taskmanagement.domain.entity")
@EnableJpaRepositories("com.salwita.taskmanagement.domain.repository")
public class TestConfiguration {
}