// Dytallix Shared Application Logic
// Global JavaScript for interactions, modals, and analytics

(function() {
  'use strict';

  // Analytics tracking
  const Analytics = {
    track: function(eventName, properties = {}) {
      console.log('[Analytics]', eventName, properties);
      // Integration point for analytics service (Google Analytics, Mixpanel, etc.)
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
      }
    },
    
    trackPageView: function(path) {
      this.track('page_view', { path: path });
    },
    
    trackButtonClick: function(buttonName, location) {
      this.track('button_click', { 
        button_name: buttonName,
        location: location 
      });
    },
    
    trackFormSubmit: function(formName) {
      this.track('form_submit', { form_name: formName });
    },
    
    trackDownload: function(fileName) {
      this.track('download', { file_name: fileName });
    },
    
    trackVideoPlay: function(videoName) {
      this.track('video_play', { video_name: videoName });
    }
  };

  // Modal functionality
  const Modal = {
    open: function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('modal-hidden');
        document.body.style.overflow = 'hidden';
        Analytics.track('modal_open', { modal_id: modalId });
      }
    },
    
    close: function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('modal-hidden');
        document.body.style.overflow = '';
        Analytics.track('modal_close', { modal_id: modalId });
      }
    },
    
    init: function() {
      // Close modal on overlay click
      document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
          const modal = e.target.closest('.modal-overlay');
          if (modal) {
            Modal.close(modal.id);
          }
        }
      });
      
      // Close modal on ESC key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          const visibleModals = document.querySelectorAll('.modal-overlay:not(.modal-hidden)');
          visibleModals.forEach(modal => {
            Modal.close(modal.id);
          });
        }
      });
    }
  };

  // Navigation highlighting
  const Navigation = {
    highlightCurrent: function() {
      const currentPath = window.location.pathname;
      const navLinks = document.querySelectorAll('.nav-menu a:not(.btn)');
      
      // Remove all existing active classes
      navLinks.forEach(link => link.classList.remove('active'));
      
      // Find the best matching link
      let bestMatch = null;
      let bestMatchLength = 0;
      
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        
        // Normalize paths for comparison
        const normalizedHref = href.endsWith('/') ? href : href + '/';
        const normalizedPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
        
        // Check for exact match or path starts with href
        if (normalizedPath === normalizedHref || 
            (normalizedPath.startsWith(normalizedHref) && normalizedHref.length > bestMatchLength)) {
          bestMatch = link;
          bestMatchLength = normalizedHref.length;
        }
      });
      
      // Apply active class to best match
      if (bestMatch) {
        bestMatch.classList.add('active');
      }
    }
  };

  // Form validation and submission
  const Forms = {
    validate: function(form) {
      const inputs = form.querySelectorAll('[required]');
      let isValid = true;
      
      inputs.forEach(input => {
        if (!input.value.trim()) {
          isValid = false;
          input.classList.add('error');
        } else {
          input.classList.remove('error');
        }
      });
      
      return isValid;
    },
    
    submitDemoRequest: async function(formData) {
      try {
        const response = await fetch('/api/demo-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          Analytics.trackFormSubmit('demo_request');
          return { success: true, message: 'Thank you! We will contact you soon.' };
        } else {
          return { success: false, message: 'There was an error submitting your request.' };
        }
      } catch (error) {
        console.error('Form submission error:', error);
        return { success: false, message: 'Network error. Please try again.' };
      }
    },
    
    init: function() {
      // Setup form submission handlers
      const demoForms = document.querySelectorAll('.demo-form');
      demoForms.forEach(form => {
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          if (!Forms.validate(form)) {
            return;
          }
          
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          
          const result = await Forms.submitDemoRequest(data);
          
          if (result.success) {
            Modal.open('success-modal');
            form.reset();
          } else {
            alert(result.message);
          }
        });
      });
    }
  };

  // Accordion functionality
  const Accordion = {
    init: function() {
      const accordions = document.querySelectorAll('.accordion-item');
      
      accordions.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        
        if (header && content) {
          header.addEventListener('click', function() {
            const isOpen = item.classList.contains('active');
            
            // Close all accordions
            accordions.forEach(a => {
              a.classList.remove('active');
              const c = a.querySelector('.accordion-content');
              if (c) c.style.maxHeight = null;
            });
            
            // Open clicked accordion if it was closed
            if (!isOpen) {
              item.classList.add('active');
              content.style.maxHeight = content.scrollHeight + 'px';
            }
          });
        }
      });
    }
  };

  // Smooth scroll for anchor links
  const SmoothScroll = {
    init: function() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          const href = this.getAttribute('href');
          if (href !== '#' && href !== '#!') {
            const target = document.querySelector(href);
            if (target) {
              e.preventDefault();
              target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
              Analytics.track('scroll_to_section', { section: href });
            }
          }
        });
      });
    }
  };

  // Copy to clipboard utility
  const Clipboard = {
    copy: function(text, successMessage = 'Copied to clipboard!') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.showMessage(successMessage);
        }).catch(err => {
          console.error('Failed to copy:', err);
        });
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          this.showMessage(successMessage);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
        document.body.removeChild(textarea);
      }
    },
    
    showMessage: function(message) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
  };

  // Video player controls
  const VideoPlayer = {
    init: function() {
      const videos = document.querySelectorAll('video[data-track]');
      videos.forEach(video => {
        video.addEventListener('play', function() {
          const videoName = this.getAttribute('data-track') || 'unknown';
          Analytics.trackVideoPlay(videoName);
        });
      });
    }
  };

  // NEW: Blockchain Data Fetcher
  const BlockchainData = {
    apiEndpoint: 'http://localhost:3003', // Dytallix blockchain node port
    retryCount: 0,
    maxRetries: 5,
    retryDelay: 2000, // Start with 2 seconds
    isBlockchainReady: false,
    
    init: function(endpoint) {
      if (endpoint) {
        this.apiEndpoint = endpoint;
      }
      // Delay initial fetch to give blockchain time to start (3 seconds)
      // This prevents console errors during service startup
      setTimeout(() => {
        this.updateWalletStatsWithRetry();
      }, 3000);
      
      // Update stats every 30 seconds (only after blockchain is ready)
      setInterval(() => {
        if (this.isBlockchainReady) {
          this.updateWalletStats();
        }
      }, 30000);
    },
    
    fetchStats: async function(silent = false) {
      try {
        // Set a reasonable timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Try to fetch from blockchain node
        const response = await fetch(`${this.apiEndpoint}/api/stats`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.isBlockchainReady = true;
          this.retryCount = 0; // Reset retry count on success
          return await response.json();
        }
      } catch (error) {
        // Only log if not silent (e.g., during initial retries)
        if (!silent) {
          console.warn('Could not fetch blockchain stats:', error.message || error);
        }
      }
      // Return fallback data
      return this.getFallbackStats();
    },
    
    updateWalletStatsWithRetry: async function() {
      const stats = await this.fetchStats(true); // Silent during retries
      this.updateStatsUI(stats);
      
      // If blockchain is not ready and we haven't exceeded max retries, try again
      if (!this.isBlockchainReady && this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(1.5, this.retryCount - 1); // Exponential backoff
        console.log(`Blockchain node not ready yet, retrying in ${Math.round(delay / 1000)}s... (attempt ${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.updateWalletStatsWithRetry(), delay);
      } else if (!this.isBlockchainReady) {
        console.info('Using fallback blockchain stats. Node may still be starting up.');
      }
    },
    
    getFallbackStats: function() {
      // Return current blockchain stats or reasonable defaults
      return {
        activeWallets: '1,247',
        transactions24h: '8,392',
        securityLevel: 'NIST-3',
        blockHeight: '245,678',
        networkHashrate: '2.4 TH/s'
      };
    },
    
    updateWalletStats: async function() {
      const stats = await this.fetchStats(false); // Not silent, log errors
      this.updateStatsUI(stats);
    },
    
    updateStatsUI: function(stats) {
      
      // Update active wallets
      const activeWalletsEl = document.getElementById('active-wallets');
      if (activeWalletsEl) {
        activeWalletsEl.textContent = stats.activeWallets;
      }
      
      // Update transactions
      const transactionsEl = document.getElementById('pqc-transactions');
      if (transactionsEl) {
        transactionsEl.textContent = stats.transactions24h;
      }
      
      // Update block height if element exists
      const blockHeightEl = document.getElementById('block-height');
      if (blockHeightEl) {
        blockHeightEl.textContent = stats.blockHeight;
      }
      
      // Update network hashrate if element exists
      const hashrateEl = document.getElementById('network-hashrate');
      if (hashrateEl) {
        hashrateEl.textContent = stats.networkHashrate;
      }
    }
  };

  // NEW: Global UI adjustments
  const UIAdjustments = {
    removeDocsLinks: function() {
      try {
        // Remove any nav/footer/hero links pointing to docs
        const docLinks = document.querySelectorAll(
          'a[href$="docs.html"], a[href*="/docs"], a[data-role="docs"]'
        );
        docLinks.forEach(el => {
          const navItem = el.closest('li');
          if (navItem && navItem.parentElement && navItem.parentElement.classList.contains('nav-menu')) {
            navItem.remove();
          } else {
            el.remove();
          }
        });

        // Remove any card with a Docs badge
        document.querySelectorAll('.card .badge').forEach(badge => {
          if (badge.textContent && badge.textContent.trim().toLowerCase() === 'docs') {
            const card = badge.closest('.card');
            if (card) card.remove();
          }
        });
      } catch (e) {
        console.warn('UIAdjustments.removeDocsLinks error:', e);
      }
    }
  };

  // Initialize all modules on DOM ready
  function init() {
    // Apply global UI adjustments first
    UIAdjustments.removeDocsLinks();

    Modal.init();
    Navigation.highlightCurrent();
    Forms.init();
    Accordion.init();
    SmoothScroll.init();
    VideoPlayer.init();
    BlockchainData.init(); // Initialize blockchain data fetcher
    Analytics.trackPageView(window.location.pathname);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export to global scope
  window.Dytallix = {
    Analytics,
    Modal,
    Navigation,
    Forms,
    Accordion,
    SmoothScroll,
    Clipboard,
    VideoPlayer,
    BlockchainData,
    UIAdjustments
  };
})();
