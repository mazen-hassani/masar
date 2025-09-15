import api from './api';
import { User } from '../types';

export interface UpdateProfileRequest {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

class UserService {
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await api.put(`/users/${data.id}`, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email
    });
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.put('/users/change-password', data);
  }

  async getProfile(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  }

  async getUserById(id: number): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  async getUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  }
}

export const userService = new UserService();