import React from 'react';

const ErrorState = ({ error, onRetry, message }) => {
  return (
    <div className="min-h-screen bg-rich-black text-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-columbia-blue">{error || message}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-4 text-columbia-blue hover:text-white transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;