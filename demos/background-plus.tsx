import { useId } from 'react';

export function BackgroundPlus({ className = '', plusColor = '#3b82f6', plusSize = 40, fade = true }: {
  className?: string; plusColor?: string; plusSize?: number; fade?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return <svg aria-hidden="true" className={`pointer-events-none h-full w-full ${className}`} style={fade ? { maskImage: 'linear-gradient(to bottom, black, transparent)' } : undefined}>
    <defs><pattern id={id} width={plusSize} height={plusSize} patternUnits="userSpaceOnUse"><path d="M 5 1 V 9 M 1 5 H 9" stroke={plusColor} strokeWidth="1" /></pattern></defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>;
}
