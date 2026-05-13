import React from 'react';

const Spinner: React.FC<{className?: string}> = ({className}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
        <p className="text-red-400 text-sm">AI is thinking...</p>
    </div>
  );
};

export default Spinner;