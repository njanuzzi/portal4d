import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-dark/80">{label}</label>
        )}
        <input
          ref={ref}
          {...props}
          className={`
            w-full px-3 py-2.5 rounded-lg border text-dark text-sm
            bg-white placeholder:text-dark/30
            focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent
            transition-colors
            ${error ? 'border-red-400 focus:ring-red-400' : 'border-beige-300'}
            ${className}
          `}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
