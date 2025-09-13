package com.salwita.taskmanagement.security;

import com.salwita.taskmanagement.domain.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private UserPrincipal userPrincipal;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        
        // Set test values using reflection
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", "myVerySecretKeyThatIsAtLeast256BitsLongForHS512AlgorithmToWorkProperly");
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationInMs", 86400000);
        ReflectionTestUtils.setField(tokenProvider, "refreshTokenExpirationInMs", 604800000);
        
        // Initialize the provider
        tokenProvider.init();

        userPrincipal = new UserPrincipal(
            1L,
            "test@example.com",
            "password",
            Role.PM,
            1L,
            true,
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_PM"))
        );

        authentication = new UsernamePasswordAuthenticationToken(
            userPrincipal, null, userPrincipal.getAuthorities());
    }

    @Test
    void shouldGenerateAccessToken() {
        String token = tokenProvider.generateAccessToken(authentication);
        
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
    }

    @Test
    void shouldGenerateRefreshToken() {
        String refreshToken = tokenProvider.generateRefreshToken(authentication);
        
        assertThat(refreshToken).isNotNull();
        assertThat(refreshToken).isNotEmpty();
        assertThat(tokenProvider.isRefreshToken(refreshToken)).isTrue();
    }

    @Test
    void shouldValidateToken() {
        String token = tokenProvider.generateAccessToken(authentication);
        
        assertThat(tokenProvider.validateToken(token)).isTrue();
    }

    @Test
    void shouldExtractUserEmailFromToken() {
        String token = tokenProvider.generateAccessToken(authentication);
        
        String email = tokenProvider.getUserEmailFromToken(token);
        assertThat(email).isEqualTo("test@example.com");
    }

    @Test
    void shouldExtractUserIdFromToken() {
        String token = tokenProvider.generateAccessToken(authentication);
        
        Long userId = tokenProvider.getUserIdFromToken(token);
        assertThat(userId).isEqualTo(1L);
    }

    @Test
    void shouldExtractOrganisationIdFromToken() {
        String token = tokenProvider.generateAccessToken(authentication);
        
        Long organisationId = tokenProvider.getOrganisationIdFromToken(token);
        assertThat(organisationId).isEqualTo(1L);
    }

    @Test
    void shouldExtractRoleFromToken() {
        String token = tokenProvider.generateAccessToken(authentication);
        
        Role role = tokenProvider.getRoleFromToken(token);
        assertThat(role).isEqualTo(Role.PM);
    }

    @Test
    void shouldDetectInvalidToken() {
        String invalidToken = "invalid.jwt.token";
        
        assertThat(tokenProvider.validateToken(invalidToken)).isFalse();
    }

    @Test
    void shouldDistinguishAccessAndRefreshTokens() {
        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication);
        
        assertThat(tokenProvider.isRefreshToken(accessToken)).isFalse();
        assertThat(tokenProvider.isRefreshToken(refreshToken)).isTrue();
    }
}