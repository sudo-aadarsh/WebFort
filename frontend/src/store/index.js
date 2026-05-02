import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('webfort_token'),
  isAuthenticated: !!localStorage.getItem('webfort_token'),
  
  login: (user, token) => {
    localStorage.setItem('webfort_token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('webfort_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  setUser: (user) => set({ user }),
}));

export const useScanStore = create((set) => ({
  activeScans: [],
  recentScans: [],
  stats: null,
  
  setActiveScans: (scans) => set({ activeScans: scans }),
  setRecentScans: (scans) => set({ recentScans: scans }),
  setStats: (stats) => set({ stats }),
  
  addActiveScan: (scan) => set((state) => ({ 
    activeScans: [scan, ...state.activeScans] 
  })),
  
  updateScanProgress: (scanId, progress, message) => set((state) => ({
    activeScans: state.activeScans.map(scan => 
      scan.id === scanId ? { ...scan, progress, message } : scan
    )
  })),
  
  removeActiveScan: (scanId) => set((state) => ({
    activeScans: state.activeScans.filter(scan => scan.id !== scanId)
  }))
}));
