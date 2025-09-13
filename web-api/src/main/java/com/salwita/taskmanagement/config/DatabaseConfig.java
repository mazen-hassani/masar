package com.salwita.taskmanagement.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableJpaRepositories(basePackages = "com.salwita.taskmanagement.domain.repository")
@EntityScan(basePackages = "com.salwita.taskmanagement.domain.entity")
@EnableJpaAuditing
@EnableTransactionManagement
public class DatabaseConfig {
}