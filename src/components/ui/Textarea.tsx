import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-dark/80">{label}</label>
        )}
        <textarea
          ref={ref}
          {...props}
          className={`
            w-full px-3 py-2.5 rounded-lg border text-dark text-sm
            bg-white placeholder:text-dark/30 resize-none
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

Textarea.displayName = 'Textarea';
