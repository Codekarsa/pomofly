module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npm start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
      ],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.8 }],
        
        // Accessibility thresholds - This is the key part for issue #361
        'categories:accessibility': ['error', { minScore: 0.95 }],
        
        // Best practices
        'categories:best-practices': ['error', { minScore: 0.9 }],
        
        // SEO
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // PWA (if applicable)
        'categories:pwa': 'off', // Can enable when PWA features are added
        
        // Specific accessibility audits
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'list': 'error',
        'listitem': 'error',
        'meta-viewport': 'error',
        'heading-order': 'error',
        'skip-link': 'warn', // May not be implemented yet
        'tabindex': 'error',
        'td-headers-attr': 'error',
        'th-has-data-cells': 'error',
        
        // Keyboard navigation
        'focusable-controls': 'error',
        'interactive-element-affordance': 'error',
        'logical-tab-order': 'error',
        'managed-focus': 'error',
        
        // Screen reader support
        'aria-allowed-attr': 'error',
        'aria-command-name': 'error',
        'aria-hidden-body': 'error',
        'aria-hidden-focus': 'error',
        'aria-input-field-name': 'error',
        'aria-meter-name': 'error',
        'aria-progressbar-name': 'error',
        'aria-required-attr': 'error',
        'aria-required-children': 'error',
        'aria-required-parent': 'error',
        'aria-roles': 'error',
        'aria-toggle-field-name': 'error',
        'aria-tooltip-name': 'error',
        'aria-treeitem-name': 'error',
        'aria-valid-attr-value': 'error',
        'aria-valid-attr': 'error',
        'button-name': 'error',
        'bypass': 'error',
        'definition-list': 'error',
        'dlitem': 'error',
        'duplicate-id-aria': 'error',
        'duplicate-id-active': 'error',
        'form-field-multiple-labels': 'error',
        'frame-title': 'error',
        'input-image-alt': 'error',
        'landmark-one-main': 'error',
        'link-in-text-block': 'warn',
        'object-alt': 'error',
        'role-img-alt': 'error',
        'scrollable-region-focusable': 'error',
        'server-response-time': 'warn',
        'valid-lang': 'error',
        'video-caption': 'error'
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};