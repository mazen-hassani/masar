import React, { forwardRef, useState } from 'react';
import { FieldError } from 'react-hook-form';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
  helpText?: string;
  required?: boolean;
  showPasswordStrength?: boolean;
  onPasswordChange?: (password: string) => void;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helpText, required, showPasswordStrength, onPasswordChange, className = '', ...props }, ref) => {
    const [passwordStrength, setPasswordStrength] = useState<number>(0);
    const inputId = props.id || `field-${props.name}`;
    
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      if (showPasswordStrength && props.type === 'password') {
        // Calculate password strength (0-4)
        let strength = 0;
        if (value.length >= 8) strength++;
        if (/[A-Z]/.test(value)) strength++;
        if (/[a-z]/.test(value)) strength++;
        if (/\d/.test(value)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength++;
        
        setPasswordStrength(strength);
        onPasswordChange?.(value);
      }
      
      props.onChange?.(e);
    };
    
    const getPasswordStrengthColor = (strength: number) => {
      if (strength <= 1) return 'bg-red-500';
      if (strength <= 2) return 'bg-yellow-500';
      if (strength <= 3) return 'bg-blue-500';
      return 'bg-green-500';
    };
    
    const getPasswordStrengthText = (strength: number) => {
      if (strength <= 1) return 'Weak';
      if (strength <= 2) return 'Fair';
      if (strength <= 3) return 'Good';
      return 'Strong';
    };
    
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <input
          {...props}
          ref={ref}
          id={inputId}
          onChange={handlePasswordChange}
          className={`
            block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 
            focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
        />
        
        {/* Password Strength Indicator */}
        {showPasswordStrength && props.type === 'password' && props.value && (
          <div className="mt-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${
                passwordStrength <= 1 ? 'text-red-600' : 
                passwordStrength <= 2 ? 'text-yellow-600' : 
                passwordStrength <= 3 ? 'text-blue-600' : 'text-green-600'
              }`}>
                {getPasswordStrengthText(passwordStrength)}
              </span>
            </div>
            {passwordStrength < 4 && (
              <p className="text-xs text-gray-500 mt-1">
                Password should contain: uppercase, lowercase, number, and special character
              </p>
            )}
          </div>
        )}
        
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error.message}
          </p>
        )}
        
        {helpText && !error && (
          <p className="text-sm text-gray-500">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';