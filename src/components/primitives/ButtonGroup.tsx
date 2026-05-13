import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
}

const ButtonGroup = ({ 
  children, 
  className, 
  orientation = 'horizontal',
  fullWidth = false 
}: ButtonGroupProps) => {
  return (
    <div className={cn(
      "inline-flex rounded-xl shadow-sm border border-border overflow-hidden",
      orientation === 'vertical' ? "flex-col" : "flex-row",
      fullWidth && "flex w-full",
      className
    )}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const element = child as React.ReactElement<any>;

        return React.cloneElement(element, {
          className: cn(
            element.props.className,
            "rounded-none border-none shadow-none focus:ring-0",
            index !== 0 && (orientation === 'horizontal' ? "border-l border-border" : "border-t border-border"),
            fullWidth && "flex-1"
          )
        });
      })}
    </div>
  );
};

export default ButtonGroup;
