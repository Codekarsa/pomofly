'use client';

import { useEffect } from 'react';
import { initializeCSPReporting, CSPConfig } from '@/utils/csp-reporter';

/**
 * CSP Monitor Component
 * 
 * Initializes Content Security Policy violation reporting
 * and provides debugging utilities in development mode.
 */
export default function CSPMonitor() {
  useEffect(() => {
    // Initialize CSP violation reporting
    initializeCSPReporting();
    
    // Validate CSP configuration in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        const isValid = CSPConfig.validate();
        if (isValid) {
          console.log('🔒 CSP Policy initialized and monitoring violations');
        }
      }, 1000);
    }
  }, []);

  // This component renders nothing - it only sets up monitoring
  return null;
}

/**
 * CSP Test Component (Development Only)
 * 
 * Provides a way to test CSP violations during development.
 * Only rendered in development mode.
 */
export function CSPTester() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const testInlineScript = () => {
    // This should trigger a CSP violation if 'unsafe-inline' is not allowed
    try {
      const script = document.createElement('script');
      script.innerHTML = 'console.log("Test inline script");';
      document.head.appendChild(script);
    } catch (error) {
      console.log('Inline script blocked by CSP (expected behavior)');
    }
  };

  const testExternalScript = () => {
    // This should trigger a CSP violation if domain is not whitelisted
    try {
      const script = document.createElement('script');
      script.src = 'https://example.com/test.js';
      document.head.appendChild(script);
    } catch (error) {
      console.log('External script blocked by CSP (expected behavior)');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#333',
      color: '#fff',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      display: process.env.NODE_ENV === 'development' ? 'block' : 'none'
    }}>
      <div>CSP Testing (Dev Only)</div>
      <button onClick={testInlineScript} style={{ margin: '5px', padding: '5px', fontSize: '10px' }}>
        Test Inline Script
      </button>
      <button onClick={testExternalScript} style={{ margin: '5px', padding: '5px', fontSize: '10px' }}>
        Test External Script
      </button>
    </div>
  );
}