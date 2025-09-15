import { clearTokens } from '../services';

class SessionManager {
  private sessionTimeoutId: NodeJS.Timeout | null = null;
  private warningTimeoutId: NodeJS.Timeout | null = null;
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
  private onSessionExpired?: () => void;
  private onSessionWarning?: () => void;

  setSessionCallbacks(
    onExpired: () => void,
    onWarning?: () => void
  ) {
    this.onSessionExpired = onExpired;
    this.onSessionWarning = onWarning;
  }

  startSession() {
    this.clearTimeouts();
    
    // Set warning timeout
    if (this.onSessionWarning) {
      this.warningTimeoutId = setTimeout(() => {
        this.onSessionWarning?.();
      }, this.SESSION_DURATION - this.WARNING_TIME);
    }
    
    // Set session expiry timeout
    this.sessionTimeoutId = setTimeout(() => {
      this.expireSession();
    }, this.SESSION_DURATION);
  }

  extendSession() {
    // Only extend if we have an active session
    if (this.sessionTimeoutId) {
      this.startSession();
    }
  }

  expireSession() {
    this.clearTimeouts();
    clearTokens();
    this.onSessionExpired?.();
  }

  clearSession() {
    this.clearTimeouts();
  }

  private clearTimeouts() {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
  }

  // Track user activity to extend session
  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const throttledExtend = this.throttle(() => this.extendSession(), 60000); // Max once per minute

    events.forEach(event => {
      document.addEventListener(event, throttledExtend, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledExtend, true);
      });
    };
  }

  private throttle(func: () => void, limit: number) {
    let inThrottle: boolean;
    return () => {
      if (!inThrottle) {
        func();
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

export const sessionManager = new SessionManager();