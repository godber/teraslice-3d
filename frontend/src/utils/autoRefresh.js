import { loadGraphData } from './api.js';

export class AutoRefresh {
  constructor(refreshCallback, options = {}) {
    this.refreshCallback = refreshCallback;
    this.interval = options.interval || 90000; // Default 90 seconds
    this.enabled = options.enabled !== false; // Default enabled
    this.intervalId = null;
    this.lastDataHash = null;
    this.lastUpdateTime = null;
    this.connectionStatus = 'unknown';
    this.statusCallbacks = [];
    
    // Load settings from localStorage
    this.loadSettings();
    
    // Start if enabled
    if (this.enabled) {
      this.start();
    }
  }
  
  loadSettings() {
    try {
      const settings = localStorage.getItem('autoRefreshSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.interval = parsed.interval || this.interval;
        this.enabled = parsed.enabled !== false;
      }
    } catch (e) {
      console.warn('Failed to load auto-refresh settings from localStorage:', e);
    }
  }
  
  saveSettings() {
    try {
      const settings = {
        interval: this.interval,
        enabled: this.enabled
      };
      localStorage.setItem('autoRefreshSettings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save auto-refresh settings to localStorage:', e);
    }
  }
  
  start() {
    if (this.intervalId) {
      return; // Already running
    }
    
    this.enabled = true;
    this.saveSettings();
    
    this.intervalId = setInterval(() => {
      this.refreshData();
    }, this.interval);
    
    console.log(`Auto-refresh started with interval: ${this.interval}ms`);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.enabled = false;
    this.saveSettings();
    
    console.log('Auto-refresh stopped');
  }
  
  setInterval(newInterval) {
    this.interval = newInterval;
    this.saveSettings();
    
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
  
  async refreshData() {
    try {
      const data = await loadGraphData();
      const dataHash = this.hashData(data);
      
      // Check if data has changed
      if (this.lastDataHash !== dataHash) {
        this.lastDataHash = dataHash;
        this.lastUpdateTime = new Date();
        
        // Call the refresh callback with new data
        if (this.refreshCallback) {
          this.refreshCallback(data);
        }
        
        this.setConnectionStatus('connected');
        console.log('Data refreshed at', this.lastUpdateTime);
      } else {
        console.log('No data changes detected');
      }
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
      this.setConnectionStatus('error');
    }
  }
  
  hashData(data) {
    // Simple hash function for change detection
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  setConnectionStatus(status) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.notifyStatusChange();
    }
  }
  
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
  }
  
  notifyStatusChange() {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.connectionStatus, this.lastUpdateTime);
      } catch (e) {
        console.error('Error in status change callback:', e);
      }
    });
  }
  
  getStatus() {
    return {
      enabled: this.enabled,
      interval: this.interval,
      connectionStatus: this.connectionStatus,
      lastUpdateTime: this.lastUpdateTime,
      isRunning: this.intervalId !== null
    };
  }
  
  // Manual refresh
  async refresh() {
    await this.refreshData();
  }
  
  // Destroy instance
  destroy() {
    this.stop();
    this.statusCallbacks = [];
  }
}