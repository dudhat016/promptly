import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RatingProps {
  value: number;
  max?: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  precision?: 0.5 | 1;
  className?: string;
  icon?: React.ElementType;
}

const Rating = ({
  value,
  max = 5,
  readOnly = false,
  onChange,
  size = 'md',
  precision = 1,
  className,
  icon: Icon = Star,
}: RatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const activeValue = hoverValue !== null ? hoverValue : value;

  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (readOnly) return;
    if (precision === 1) {
      setHoverValue(index + 1);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      setHoverValue(index + (isHalf ? 0.5 : 1));
    }
  };

  const handleClick = (val: number) => {
    if (readOnly) return;
    onChange?.(val);
  };

  return (
    <div 
      className={cn("flex items-center gap-0.5", className)}
      onMouseLeave={() => setHoverValue(null)}
    >
      {[...Array(max)].map((_, i) => {
        const fullValue = i + 1;
        const halfValue = i + 0.5;
        const isFull = activeValue >= fullValue;
        const isHalf = activeValue >= halfValue && activeValue < fullValue;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onClick={() => handleClick(hoverValue || fullValue)}
            className={cn(
              "focus:outline-none transition-transform active:scale-90",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
              (isFull || isHalf) ? "text-amber-400" : "text-muted-foreground/30"
            )}
          >
            {isHalf ? (
              <StarHalf className={cn(sizes[size], "fill-current")} />
            ) : (
              <Icon className={cn(sizes[size], isFull && "fill-current")} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Rating;
