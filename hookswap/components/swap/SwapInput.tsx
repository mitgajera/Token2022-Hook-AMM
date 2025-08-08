'use client';

import { Input } from '@/components/ui/input';
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
  className 
}: SwapInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Only allow numbers and decimals
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <Input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={cn(
        'border-0 bg-transparent text-2xl font-semibold placeholder:text-gray-500 focus:ring-0 focus:outline-none p-0 h-auto',
        readOnly && 'cursor-default',
        className
      )}
    />
  );
}