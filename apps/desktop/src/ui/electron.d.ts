export type JamClientState = 'idle' | 'launching' | 'running' | 'failed' | 'exited';
export type JamBroadcastState = 'idle' | 'launching' | 'running' | 'failed' | 'exited' | 'stopping';
export type UpdateStatus = {
    state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'unavailable' | 'error';
    version?: string;
    progress?: number;
    error?: string;
};

export interface JamClientLaunchContext {
    serverHost: string;
    serverPort: number;
    roomId: string;
    roomHandle: string;
    profileId: string;
    displayName: string;
    joinToken: string;
    codec: 'opus' | 'pcm';
    frames: number;
    broadcastIpcPort?: number;
}

export interface JamBroadcastLaunchContext {
    roomId: string;
    ipcPort: number;
    srtUrl: string;
    hlsUrl: string;
}

export interface JamBroadcastStatus {
    state: JamBroadcastState;
    exitCode?: number | null;
    error?: string;
    hlsUrl?: string;
    logPath?: string;
}

export interface ElectronAPI {
    platform: 'darwin' | 'win32' | 'linux';
    launchJamClient: (context: JamClientLaunchContext) => Promise<{ success: boolean; error?: string; state?: JamClientState; logPath?: string }>;
    getJamClientStatus: () => Promise<{ state: JamClientState; exitCode?: number | null; error?: string; logPath?: string }>;
    launchJamBroadcast: (context: JamBroadcastLaunchContext) => Promise<{ success: boolean; error?: string } & JamBroadcastStatus>;
    stopJamBroadcast: () => Promise<{ success: boolean; error?: string } & JamBroadcastStatus>;
    getJamBroadcastStatus: () => Promise<JamBroadcastStatus>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    onNavigate: (callback: (path: string) => void) => void;
    onToggleTheme: (callback: () => void) => void;
    saveTheme: (theme: 'dark' | 'light') => void;
    updateTitleBarOverlay: (theme: 'dark' | 'light') => void;
    getAppVersion: () => Promise<string>;
    getUpdateStatus: () => Promise<UpdateStatus>;
    checkForUpdates: () => Promise<UpdateStatus>;
    installUpdate: () => Promise<{ success: boolean; error?: string }>;
    onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
    setPresenceSessionState: (state: { sessionToken: string | null; convexUrl?: string | null }) => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}


