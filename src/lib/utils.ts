import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type Data } from "../dataSchema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Local storage service for data persistence
export const storageService = {
  saveData: (data: Data): void => {
    try {
      localStorage.setItem('ai-progress-data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  loadData: (): Data | null => {
    try {
      const data = localStorage.getItem('ai-progress-data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  },

  // Download file
  downloadJson: (data: Data, filename: string): void => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }
};

// Custom event service to replace Tauri events
export const eventService = {
  emitDataUpdate: (data: Data): void => {
    const event = new CustomEvent('data-update', { detail: data });
    window.dispatchEvent(event);
  },
  
  onDataUpdate: (callback: (data: Data) => void): () => void => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<Data>;
      callback(customEvent.detail);
    };
    
    window.addEventListener('data-update', handler);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('data-update', handler);
    };
  }
};