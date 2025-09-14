import { useAuthContext } from '../context/AuthContext';

// Custom hook to use auth context
export const useAuth = () => {
  return useAuthContext();
};