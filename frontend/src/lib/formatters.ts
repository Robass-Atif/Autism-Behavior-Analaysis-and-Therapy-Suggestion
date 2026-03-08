export const formatPhoneNumber = (value: string) => {
  if (!value) return value;
  
  const isPlus = value.startsWith('+');
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return isPlus ? '+' : '';
  
  if (isPlus) {
    if (digits.length <= 1) return `+${digits}`;
    if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)})`;
    if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 15)}`;
  } else {
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 15)}`;
  }
};
