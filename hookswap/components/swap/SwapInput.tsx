'use client';

import { cn } from '@/lib/utils';

interface SwapInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export function SwapInput({
  value,
  onChange,
  placeholder = "0.0",
  readOnly = false,
  className,
}: SwapInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Only allow valid numeric input with up to one decimal point
    if (/^$|^[0-9]*\.?[0-9]*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={cn(
        "w-full bg-transparent border-none text-2xl font-medium text-white placeholder:text-gray-500 focus:outline-none focus:ring-0",
        readOnly && "text-gray-300 opacity-90",
        className
      )}
    />
  );
}