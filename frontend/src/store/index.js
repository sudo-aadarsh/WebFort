import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('websecure_token'),
  isAuthenticated: !!localStorage.getItem('websecure_token'),
  
  login: (user, token) => {
    localStorage.setItem('websecure_token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('websecure_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  setUser: (user) => set({ user }),
}));

export const useScanStore = create((set) => ({
  activeScans: [],
  scans: [], // Centralized scan history
  stats: null,
  
  setActiveScans: (scans) => set({ activeScans: scans }),
  setScans: (scans) => set({ scans }),
  setStats: (stats) => set({ stats }),
  
  addScan: (scan) => set((state) => ({ 
    scans: [scan, ...state.scans],
    activeScans: ['running', 'queued'].includes(scan.status) ? [scan, ...state.activeScans] : state.activeScans
  })),
  
  updateScanProgress: (scanId, progress, message) => set((state) => ({
    // Update Active Scans
    activeScans: state.activeScans.map(scan => 
      scan.id === scanId ? { ...scan, progress, message, status: 'running' } : scan
    ),
    // Update History Table
    scans: state.scans.map(scan =>
      scan.id === scanId ? { ...scan, progress, message, status: 'running' } : scan
    )
  })),
  
  removeActiveScan: (scanId) => set((state) => ({
    activeScans: state.activeScans.filter(scan => scan.id !== scanId)
  }))
}));

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem('websecure_theme') || 'light',
  isSidebarCollapsed: localStorage.getItem('websecure_sidebar_collapsed') === 'true',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('websecure_theme', newTheme);
    return { theme: newTheme };
  }),
  toggleSidebar: () => set((state) => {
    const newState = !state.isSidebarCollapsed;
    localStorage.setItem('websecure_sidebar_collapsed', newState);
    return { isSidebarCollapsed: newState };
  }),
  setTheme: (theme) => {
    localStorage.setItem('websecure_theme', theme);
    set({ theme });
  }
}));

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => set((state) => ({
    notifications: [{ id: Date.now(), timestamp: new Date(), read: false, ...notification }, ...state.notifications].slice(0, 50),
    unreadCount: state.unreadCount + 1
  })),
  
  markAsRead: (id) => set((state) => {
    const isUnread = state.notifications.find(n => n.id === id && !n.read);
    return {
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: isUnread ? state.unreadCount - 1 : state.unreadCount
    };
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0
  })),
  
  clearAll: () => set({ notifications: [], unreadCount: 0 })
}));
