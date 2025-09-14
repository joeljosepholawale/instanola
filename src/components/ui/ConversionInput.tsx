import React, { useState, useCallback, memo } from 'react';

interface ConversionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const ConversionInput = memo(({ value, onChange, placeholder = "0.00", className }: ConversionInputProps) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    // Allow numbers, one decimal point, and up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(inputValue)) {
      onChange(inputValue);
    }
    // If invalid, don't update state (prevents re-render and focus loss)
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys, backspace, delete, etc.
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      return;
    }
    // Allow Ctrl+A, Ctrl+C, Ctrl+V, etc.
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    // Only allow numbers and decimal point
    if (!/[\d.]/.test(e.key)) {
      e.preventDefault();
    }
    // Prevent multiple decimal points
    if (e.key === '.' && value.includes('.')) {
      e.preventDefault();
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      autoComplete="off"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={className || "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"}
    />
  );
});

ConversionInput.displayName = 'ConversionInput';

export default ConversionInput;
