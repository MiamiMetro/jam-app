export type JamClientState = 'idle' | 'launching' | 'running' | 'failed' | 'exited';

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
}

export interface ElectronAPI {
    platform: 'darwin' | 'win32' | 'linux';
    launchJamClient: (context: JamClientLaunchContext) => Promise<{ success: boolean; error?: string; state?: JamClientState }>;
    getJamClientStatus: () => Promise<{ state: JamClientState; exitCode?: number | null; error?: string }>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    onNavigate: (callback: (path: string) => void) => void;
    onToggleTheme: (callback: () => void) => void;
    saveTheme: (theme: 'dark' | 'light') => void;
    updateTitleBarOverlay: (theme: 'dark' | 'light') => void;
    setPresenceSessionState: (state: { sessionToken: string | null; convexUrl?: string | null }) => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}


