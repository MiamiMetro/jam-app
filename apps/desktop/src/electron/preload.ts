import { contextBridge, ipcRenderer } from 'electron';

type UpdateStatus = {
    state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'unavailable' | 'error';
    version?: string;
    progress?: number;
    error?: string;
};

contextBridge.exposeInMainWorld('electron', {
    platform: process.platform as 'darwin' | 'win32' | 'linux',
    launchJamClient: (context: unknown) => ipcRenderer.invoke('launch-jam-client', context),
    getJamClientStatus: () => ipcRenderer.invoke('get-jam-client-status'),
    launchJamBroadcast: (context: unknown) => ipcRenderer.invoke('launch-jam-broadcast', context),
    stopJamBroadcast: () => ipcRenderer.invoke('stop-jam-broadcast'),
    getJamBroadcastStatus: () => ipcRenderer.invoke('get-jam-broadcast-status'),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    onNavigate: (callback: (path: string) => void) => {
        ipcRenderer.removeAllListeners('navigate');
        ipcRenderer.on('navigate', (_event, path) => callback(path));
    },
    onToggleTheme: (callback: () => void) => {
        ipcRenderer.removeAllListeners('toggle-theme');
        ipcRenderer.on('toggle-theme', () => callback());
    },
    saveTheme: (theme: 'dark' | 'light') => {
        ipcRenderer.invoke('save-theme', theme);
    },
    updateTitleBarOverlay: (theme: 'dark' | 'light') => {
        ipcRenderer.invoke('update-title-bar-overlay', theme);
    },
    getUpdateStatus: () => ipcRenderer.invoke('get-update-status') as Promise<UpdateStatus>,
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates') as Promise<UpdateStatus>,
    installUpdate: () => ipcRenderer.invoke('install-update') as Promise<{ success: boolean; error?: string }>,
    onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
        ipcRenderer.on('update-status', listener);
        return () => ipcRenderer.removeListener('update-status', listener);
    },
    setPresenceSessionState: (state: { sessionToken: string | null; convexUrl?: string | null }) => {
        ipcRenderer.send('presence-session-state', state);
    },
});


