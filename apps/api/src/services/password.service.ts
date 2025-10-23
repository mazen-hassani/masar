// ABOUTME: Service for password hashing and verification using bcrypt
// ABOUTME: Handles secure password operations with configurable salt rounds

import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export class PasswordService {
  /**
   * Hash a plaintext password using bcrypt
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a plaintext password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }
}

export const passwordService = new PasswordService();
