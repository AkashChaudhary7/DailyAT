/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text while converting [IMAGE: url] markers into actual <img> tags.
 * Preserves newlines using whitespace-pre-wrap.
 */
export default function FormattedText({ text, className }: FormattedTextProps) {
  if (!text) return null;

  // Split text by the image marker pattern: [IMAGE: url]
  const parts = text.split(/(\[IMAGE: [^\]]+\])/g);

  return (
    <div className={`whitespace-pre-wrap ${className || ''}`}>
      {parts.map((part, index) => {
        const imageMatch = part.match(/\[IMAGE: (.*?)\]/);
        
        if (imageMatch) {
          const imageUrl = imageMatch[1].trim();
          return (
            <div key={index} className="my-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 inline-block max-w-full">
              <img 
                src={imageUrl} 
                alt="Diagram or Equation" 
                className="max-w-full h-auto object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none'; // Hide if fails to load
                }}
              />
            </div>
          );
        }
        
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}
