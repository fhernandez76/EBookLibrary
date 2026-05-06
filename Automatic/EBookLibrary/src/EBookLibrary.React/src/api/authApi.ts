import { apiClient } from './apiClient';
import type { AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../types/api';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data).then(r => r.data.data!),

  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data).then(r => r.data.data!),
};
