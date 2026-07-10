import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      // State
      theme: 'dark',
      sidebarOpen: false,
      userPreferences: {
        showTooltips: true,
      },

      // Actions
      toggleTheme: () => 
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
        
      setSidebarOpen: (isOpen) => 
        set({ sidebarOpen: isOpen }),
        
      updatePreferences: (prefs) => 
        set((state) => ({ 
          userPreferences: { ...state.userPreferences, ...prefs } 
        })),
        
      reset: () => set({ 
        theme: 'dark', 
        sidebarOpen: false, 
        userPreferences: { showTooltips: true } 
      }),
    }),
    {
      name: 'vtm-app-storage', // unique name for localStorage key
      partialize: (state) => ({ theme: state.theme, userPreferences: state.userPreferences }), // Only persist these fields
    }
  )
);
