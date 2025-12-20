/**
 * Loading States and Skeleton Screens for Mobile
 * Provides visual feedback during data loading
 */

import React from 'react';
import './LoadingStates.css';

/**
 * Skeleton Box Item - Shows loading state for box list items
 */
export const SkeletonBoxItem = () => (
  <div className="skeleton-box-item">
    <div className="skeleton-badge" />
    <div className="skeleton-info">
      <div className="skeleton-text skeleton-text-large" />
      <div className="skeleton-text skeleton-text-small" />
    </div>
    <div className="skeleton-icon" />
  </div>
);

/**
 * Skeleton Object Item - Shows loading state for object list items
 */
export const SkeletonObjectItem = () => (
  <div className="skeleton-object-item">
    <div className="skeleton-icon-circle" />
    <div className="skeleton-info">
      <div className="skeleton-text skeleton-text-large" />
      <div className="skeleton-text skeleton-text-small" />
    </div>
    <div className="skeleton-chevron" />
  </div>
);

/**
 * Loading Spinner - Inline spinner for buttons and small areas
 */
export const LoadingSpinner = ({ size = 20, color = 'currentColor' }) => (
  <div 
    className="loading-spinner" 
    style={{ 
      width: size, 
      height: size,
      borderColor: `${color}33`,
      borderTopColor: color
    }}
  />
);

/**
 * Full Page Loading - Shows when loading entire page
 */
export const FullPageLoading = ({ message = 'Laden...' }) => (
  <div className="full-page-loading">
    <LoadingSpinner size={48} color="#3b82f6" />
    <p>{message}</p>
  </div>
);

/**
 * List Loading Skeleton - Shows multiple skeleton items
 */
export const ListLoadingSkeleton = ({ count = 3, type = 'box' }) => {
  const SkeletonComponent = type === 'box' ? SkeletonBoxItem : SkeletonObjectItem;
  
  return (
    <div className="list-loading-skeleton">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  );
};

/**
 * Inline Loading - Small loading state for inline elements
 */
export const InlineLoading = ({ text = 'Laden...' }) => (
  <div className="inline-loading">
    <LoadingSpinner size={16} />
    <span>{text}</span>
  </div>
);

/**
 * Pulsating Dot - Subtle loading indicator
 */
export const PulsatingDot = () => (
  <div className="pulsating-dot" />
);
