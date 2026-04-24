package com.meetx.service;

import com.meetx.dto.AuthResponse;
import com.meetx.dto.LoginRequest;
import com.meetx.dto.RegisterRequest;
import com.meetx.model.User;
import com.meetx.repository.UserRepository;
import com.meetx.security.JwtUtil;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtUtil jwtUtil;

  /**
   * Registers a new user. Throws RuntimeException (caught by GlobalExceptionHandler) if email
   * already exists.
   *
   * @param request name, email, password (plain-text)
   * @return JWT + user info
   */
  public AuthResponse register(RegisterRequest request) {
    if (userRepository.existsByEmail(request.getEmail())) {
      throw new RuntimeException("Email is already registered: " + request.getEmail());
    }

    User user =
        User.builder()
            .name(request.getName())
            .email(request.getEmail().toLowerCase().trim())
            .password(passwordEncoder.encode(request.getPassword()))
            .createdAt(LocalDateTime.now())
            .build();

    userRepository.save(user);
    log.debug("New user registered: {}", user.getEmail());

    String token = jwtUtil.generateToken(user.getEmail());
    return new AuthResponse(token, user.getEmail(), user.getName());
  }

  /**
   * Authenticates an existing user. Deliberately uses the same error message for wrong email AND
   * wrong password to avoid leaking whether an account exists.
   *
   * @param request email, password (plain-text)
   * @return JWT + user info
   */
  public AuthResponse login(LoginRequest request) {
    User user =
        userRepository
            .findByEmail(request.getEmail().toLowerCase().trim())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

    if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
      throw new RuntimeException("Invalid email or password");
    }

    log.debug("User logged in: {}", user.getEmail());

    String token = jwtUtil.generateToken(user.getEmail());
    return new AuthResponse(token, user.getEmail(), user.getName());
  }
}
