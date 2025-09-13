package com.salwita.taskmanagement.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salwita.taskmanagement.dto.AuthenticationRequest;
import com.salwita.taskmanagement.dto.AuthenticationResponse;
import com.salwita.taskmanagement.dto.RefreshTokenRequest;
import com.salwita.taskmanagement.service.AuthService;
import com.salwita.taskmanagement.domain.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    void shouldAuthenticateUser() throws Exception {
        // Given
        AuthenticationRequest request = new AuthenticationRequest("test@example.com", "password");
        AuthenticationResponse response = new AuthenticationResponse(
            "access-token", "refresh-token", 1L, "test@example.com", Role.PM, 1L, "Test Organization"
        );

        when(authService.authenticateUser(any(AuthenticationRequest.class))).thenReturn(response);

        // When & Then
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpected(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.role").value("PM"));
    }

    @Test
    void shouldRefreshToken() throws Exception {
        // Given
        RefreshTokenRequest request = new RefreshTokenRequest("refresh-token");
        AuthenticationResponse response = new AuthenticationResponse(
            "new-access-token", "new-refresh-token", 1L, "test@example.com", Role.PM, 1L, "Test Organization"
        );

        when(authService.refreshToken(any(RefreshTokenRequest.class))).thenReturn(response);

        // When & Then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh-token"));
    }

    @Test
    void shouldReturnBadRequestForInvalidLoginData() throws Exception {
        // Given - invalid request with missing email
        AuthenticationRequest request = new AuthenticationRequest("", "password");

        // When & Then
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void shouldLogoutUser() throws Exception {
        mockMvc.perform(post("/auth/logout")
                .header("Authorization", "Bearer some-token")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User logged out successfully"));
    }
}