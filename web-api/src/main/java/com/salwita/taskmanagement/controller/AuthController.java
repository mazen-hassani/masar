package com.salwita.taskmanagement.controller;

import com.salwita.taskmanagement.dto.AuthenticationRequest;
import com.salwita.taskmanagement.dto.AuthenticationResponse;
import com.salwita.taskmanagement.dto.RefreshTokenRequest;
import com.salwita.taskmanagement.security.UserPrincipal;
import com.salwita.taskmanagement.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "Authentication and authorization endpoints")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Authenticate user with email and password")
    public ResponseEntity<AuthenticationResponse> authenticateUser(@Valid @RequestBody AuthenticationRequest request) {
        AuthenticationResponse response = authService.authenticateUser(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Generate new access token using refresh token")
    public ResponseEntity<AuthenticationResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthenticationResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Logout user and invalidate token")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        String token = getJwtFromRequest(request);
        if (token != null) {
            authService.logout(token);
        }
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "User logged out successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user", description = "Get current authenticated user information")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", userPrincipal.getId());
            userInfo.put("email", userPrincipal.getEmail());
            userInfo.put("role", userPrincipal.getRole());
            userInfo.put("organisationId", userPrincipal.getOrganisationId());
            userInfo.put("isAuthenticated", true);
            
            return ResponseEntity.ok(userInfo);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("isAuthenticated", false);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/validate")
    @Operation(summary = "Validate token", description = "Validate if the provided token is still valid")
    public ResponseEntity<Map<String, Boolean>> validateToken(HttpServletRequest request) {
        String token = getJwtFromRequest(request);
        boolean isValid = token != null && authService.isTokenValid(token);
        
        Map<String, Boolean> response = new HashMap<>();
        response.put("valid", isValid);
        return ResponseEntity.ok(response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}