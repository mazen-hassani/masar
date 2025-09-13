package com.salwita.taskmanagement.service;

import com.salwita.taskmanagement.domain.entity.User;
import com.salwita.taskmanagement.domain.repository.UserRepository;
import com.salwita.taskmanagement.dto.AuthenticationRequest;
import com.salwita.taskmanagement.dto.AuthenticationResponse;
import com.salwita.taskmanagement.dto.RefreshTokenRequest;
import com.salwita.taskmanagement.exception.InvalidCredentialsException;
import com.salwita.taskmanagement.exception.TokenRefreshException;
import com.salwita.taskmanagement.security.JwtTokenProvider;
import com.salwita.taskmanagement.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    public AuthenticationResponse authenticateUser(AuthenticationRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            String accessToken = tokenProvider.generateAccessToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(authentication);

            // Log successful authentication
            logger.info("User authenticated successfully: {}", userPrincipal.getEmail());

            return new AuthenticationResponse(
                accessToken,
                refreshToken,
                userPrincipal.getId(),
                userPrincipal.getEmail(),
                userPrincipal.getRole(),
                userPrincipal.getOrganisationId(),
                getOrganisationName(userPrincipal.getOrganisationId())
            );

        } catch (AuthenticationException e) {
            logger.error("Authentication failed for user: {}", request.getEmail());
            throw new InvalidCredentialsException("Invalid email or password");
        }
    }

    public AuthenticationResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw new TokenRefreshException("Invalid refresh token");
        }

        String userEmail = tokenProvider.getUserEmailFromToken(refreshToken);
        Optional<User> userOpt = userRepository.findByEmail(userEmail);
        
        if (userOpt.isEmpty()) {
            throw new TokenRefreshException("User not found for refresh token");
        }

        User user = userOpt.get();
        UserPrincipal userPrincipal = UserPrincipal.create(user);
        
        // Create new authentication object for token generation
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userPrincipal, null, userPrincipal.getAuthorities()
        );

        String newAccessToken = tokenProvider.generateAccessToken(authentication);
        String newRefreshToken = tokenProvider.generateRefreshToken(authentication);

        logger.info("Token refreshed successfully for user: {}", userEmail);

        return new AuthenticationResponse(
            newAccessToken,
            newRefreshToken,
            user.getId(),
            user.getEmail(),
            user.getRole(),
            user.getOrganisation().getId(),
            user.getOrganisation().getName()
        );
    }

    private String getOrganisationName(Long organisationId) {
        // This could be optimized by including organisation name in the token
        // For now, we'll return a placeholder
        return "Organization"; // In real implementation, fetch from database
    }

    public void logout(String token) {
        // In a production system, you might want to blacklist the token
        // For stateless JWT, logout is typically handled on the client side
        // by removing the token from storage
        
        if (tokenProvider.validateToken(token)) {
            String userEmail = tokenProvider.getUserEmailFromToken(token);
            logger.info("User logged out: {}", userEmail);
        }
    }

    public boolean isTokenValid(String token) {
        return tokenProvider.validateToken(token);
    }
}