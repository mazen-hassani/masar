import { FieldError } from 'react-hook-form';

// Common validation rules for React Hook Form
export const validationRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Please enter a valid email address'
    }
  },
  
  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters'
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
  },

  strongPassword: {
    required: 'Password is required',
    minLength: {
      value: 12,
      message: 'Password must be at least 12 characters'
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },

  name: {
    required: 'This field is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters'
    },
    maxLength: {
      value: 50,
      message: 'Name must be less than 50 characters'
    },
    pattern: {
      value: /^[a-zA-Z\s'-]+$/,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }
  },

  phone: {
    pattern: {
      value: /^[\+]?[1-9][\d]{0,15}$/,
      message: 'Please enter a valid phone number'
    }
  },

  url: {
    pattern: {
      value: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      message: 'Please enter a valid URL'
    }
  },

  requiredSelect: {
    required: 'Please select an option',
    validate: (value: string) => value !== '' || 'Please select an option'
  },

  positiveNumber: {
    required: 'This field is required',
    min: {
      value: 0,
      message: 'Value must be positive'
    }
  }
};

// Custom validation functions
export const customValidations = {
  // Validate that two fields match (e.g., password confirmation)
  matchField: (fieldName: string) => (value: string, formValues: Record<string, any>) => {
    return value === formValues[fieldName] || `This field must match ${fieldName}`;
  },

  // Validate file size
  fileSize: (maxSizeMB: number) => (files: FileList) => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes || `File size must be less than ${maxSizeMB}MB`;
  },

  // Validate file type
  fileType: (allowedTypes: string[]) => (files: FileList) => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    return allowedTypes.includes(fileExtension) || `File must be one of: ${allowedTypes.join(', ')}`;
  },

  // Validate date range
  dateRange: (minDate?: Date, maxDate?: Date) => (value: string) => {
    if (!value) return true;
    const date = new Date(value);
    
    if (minDate && date < minDate) {
      return `Date must be after ${minDate.toLocaleDateString()}`;
    }
    
    if (maxDate && date > maxDate) {
      return `Date must be before ${maxDate.toLocaleDateString()}`;
    }
    
    return true;
  },

  // Validate minimum age
  minimumAge: (minAge: number) => (value: string) => {
    if (!value) return true;
    const birthDate = new Date(value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= minAge || `You must be at least ${minAge} years old`;
    }
    
    return age >= minAge || `You must be at least ${minAge} years old`;
  },

  // Validate array minimum length
  arrayMinLength: (minLength: number) => (value: any[]) => {
    if (!Array.isArray(value)) return true;
    return value.length >= minLength || `Please select at least ${minLength} item(s)`;
  },

  // Validate credit card number (basic Luhn algorithm)
  creditCard: (value: string) => {
    if (!value) return true;
    const cardNumber = value.replace(/\s/g, '');
    
    if (!/^\d+$/.test(cardNumber)) {
      return 'Credit card number can only contain digits';
    }
    
    // Luhn algorithm
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0 || 'Invalid credit card number';
  }
};

// Error formatting utilities
export const formatFieldError = (error: FieldError | undefined): string | undefined => {
  if (!error) return undefined;
  return error.message || 'Invalid value';
};

export const getErrorMessage = (errors: Record<string, FieldError>, fieldName: string): string | undefined => {
  const error = errors[fieldName];
  return formatFieldError(error);
};

// Form submission helpers
export const createFormSubmitHandler = <T>(
  onSubmit: (data: T) => Promise<void> | void,
  onError?: (error: any) => void,
  setError?: (field: string, error: { type: string; message: string }) => void
) => {
  return async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      if (setError) {
        // Handle field-specific errors
        if (error.fieldErrors) {
          Object.entries(error.fieldErrors).forEach(([field, message]) => {
            setError(field, { type: 'manual', message: message as string });
          });
        } else {
          // Generic error
          setError('root', {
            type: 'manual',
            message: error.message || 'An error occurred while submitting the form'
          });
        }
      }
      
      if (onError) {
        onError(error);
      }
    }
  };
};

// Validation state helpers
export const hasErrors = (errors: Record<string, FieldError>): boolean => {
  return Object.keys(errors).length > 0;
};

export const getFirstError = (errors: Record<string, FieldError>): string | undefined => {
  const firstErrorKey = Object.keys(errors)[0];
  return firstErrorKey ? formatFieldError(errors[firstErrorKey]) : undefined;
};