package com.meetx.controller;

import com.meetx.dto.ApiResponse;
import com.meetx.dto.AuthResponse;
import com.meetx.dto.LoginRequest;
import com.meetx.dto.RegisterRequest;
import com.meetx.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

  private final AuthService authService;

  /**
   * POST /api/auth/register
   *
   * <p>
   * Request body: { "name": "Saim", "email": "saim@meetx.io", "password":
   * "supersecret" }
   *
   * <p>
   * Response (201 Created): { "success": true, "message": "Registration
   * successful", "data": {
   * "token": "<JWT>", "email": "saim@meetx.io", "name": "Saim" } }
   */
  @PostMapping("/register")
  public ResponseEntity<ApiResponse<AuthResponse>> register(@RequestBody RegisterRequest request) {

    AuthResponse response = authService.register(request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success("Registration successful", response));
  }

  /**
   * POST /api/auth/login
   *
   * <p>
   * Request body: { "email": "saim@meetx.io", "password": "supersecret" }
   *
   * <p>
   * Response (200 OK): { "success": true, "message": "Login successful", "data":
   * { "token":
   * "<JWT>", "email": "saim@meetx.io", "name": "Saim" } }
   */
  @PostMapping("/login")
  public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody LoginRequest request) {

    AuthResponse response = authService.login(request);
    return ResponseEntity.ok(ApiResponse.success("Login successful", response));
  }
}
