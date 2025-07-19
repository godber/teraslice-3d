import { loadGraphData } from './api.js';
import { AutoRefreshOptions, AutoRefreshStatus, RefreshCallback, StatusCallback, GraphData } from '../types/graph.js';

export class AutoRefresh {
  private refreshCallback: RefreshCallback;
  private interval: number;
  private enabled: boolean;
  private intervalId: NodeJS.Timeout | null;
  private lastDataHash: number | null;
  private lastUpdateTime: Date | null;
  private connectionStatus: 'unknown' | 'connected' | 'error';
  private statusCallbacks: StatusCallback[];

  constructor(refreshCallback: RefreshCallback, options: AutoRefreshOptions = {}) {
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
  
  private loadSettings(): void {
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
  
  private saveSettings(): void {
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
  
  public start(): void {
    if (this.intervalId) {
      return; // Already running
    }
    
    this.enabled = true;
    this.saveSettings();
    
    this.intervalId = setInterval(() => {
      this.refreshData();
    }, this.interval) as NodeJS.Timeout;
    
    console.log(`Auto-refresh started with interval: ${this.interval}ms`);
  }
  
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.enabled = false;
    this.saveSettings();
    
    console.log('Auto-refresh stopped');
  }
  
  public setInterval(newInterval: number): void {
    this.interval = newInterval;
    this.saveSettings();
    
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
  
  private async refreshData(): Promise<void> {
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
  
  private hashData(data: GraphData): number {
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
  
  private setConnectionStatus(status: 'unknown' | 'connected' | 'error'): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.notifyStatusChange();
    }
  }
  
  public onStatusChange(callback: StatusCallback): void {
    this.statusCallbacks.push(callback);
  }
  
  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.connectionStatus, this.lastUpdateTime);
      } catch (e) {
        console.error('Error in status change callback:', e);
      }
    });
  }
  
  public getStatus(): AutoRefreshStatus {
    return {
      enabled: this.enabled,
      interval: this.interval,
      connectionStatus: this.connectionStatus,
      lastUpdateTime: this.lastUpdateTime,
      isRunning: this.intervalId !== null
    };
  }
  
  // Manual refresh
  public async refresh(): Promise<void> {
    await this.refreshData();
  }
  
  // Destroy instance
  public destroy(): void {
    this.stop();
    this.statusCallbacks = [];
  }
}