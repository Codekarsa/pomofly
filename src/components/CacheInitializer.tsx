'use client'
import React, { useEffect } from 'react';
import { AppCacheManager, LegacyMigration } from '@/lib/appCache';

/**
 * Component responsible for initializing cache management system
 * Should be mounted once at the app level
 */
export const CacheInitializer: React.FC = () => {
  useEffect(() => {
    // Migrate legacy localStorage data to new cache system
    LegacyMigration.migrateLegacyData();
    
    // Initialize cache management with periodic cleanup
    AppCacheManager.initialize();

    // Cleanup on unmount
    return () => {
      AppCacheManager.destroy();
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default CacheInitializer;