import { app, BrowserWindow, ipcMain, Menu, session, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { isDev } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Theme background colors (read at startup to prevent native window flash)
// Must approximate the CSS --background values (oklch dark ≈ #1e1d2b, light ≈ #f5f0e8)
const THEME_BG = { dark: '#1e1d2b', light: '#f5f0e8' } as const;

// Windows titleBarOverlay: transparent so panel backgrounds show through seamlessly
const OVERLAY_BG = '#00000000';

// Windows titleBarOverlay symbol colors per theme (caption button icons)
const OVERLAY_SYMBOL = { dark: '#e8e6f0', light: '#2c2518' } as const;

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function getSavedTheme(): 'dark' | 'light' {
    try {
        const data = JSON.parse(readFileSync(path.join(app.getPath('userData'), 'theme.json'), 'utf-8'));
        return data.theme === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
}

// Track the spawned client process
let clientProcess: ChildProcess | null = null;
type JamClientState = 'idle' | 'launching' | 'running' | 'failed' | 'exited';
type JamBroadcastState = 'idle' | 'launching' | 'running' | 'failed' | 'exited' | 'stopping';
type JamClientLaunchContext = {
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
};
type JamBroadcastLaunchContext = {
    roomId: string;
    ipcPort: number;
    srtUrl: string;
    hlsUrl: string;
};
let jamClientState: JamClientState = 'idle';
let jamClientExitCode: number | null = null;
let jamClientError: string | undefined;
let broadcasterProcess: ChildProcess | null = null;
let jamBroadcastState: JamBroadcastState = 'idle';
let jamBroadcastExitCode: number | null = null;
let jamBroadcastError: string | undefined;
let jamBroadcastHlsUrl: string | undefined;
let jamBroadcastStopRequested = false;

function getClientExecutablePath() {
    const platform = process.platform;
    const clientExecutable = platform === 'win32' ? 'client.exe' : 'client';

    if (isDev()) {
        return path.join(process.cwd(), 'resources', 'client', clientExecutable);
    }

    let clientPath = path.join(process.resourcesPath, 'client', clientExecutable);
    if (!existsSync(clientPath)) {
        const altPath = path.join(process.resourcesPath, 'resources', 'client', clientExecutable);
        if (existsSync(altPath)) {
            clientPath = altPath;
        }
    }
    return clientPath;
}

function getBroadcasterExecutablePath() {
    const platform = process.platform;
    const broadcasterExecutable = platform === 'win32' ? 'jam_broadcaster.exe' : 'jam_broadcaster';

    if (isDev()) {
        return path.join(process.cwd(), 'resources', 'client', broadcasterExecutable);
    }

    let broadcasterPath = path.join(process.resourcesPath, 'client', broadcasterExecutable);
    if (!existsSync(broadcasterPath)) {
        const altPath = path.join(process.resourcesPath, 'resources', 'client', broadcasterExecutable);
        if (existsSync(altPath)) {
            broadcasterPath = altPath;
        }
    }
    return broadcasterPath;
}

function isLaunchContext(value: unknown): value is JamClientLaunchContext {
    if (!value || typeof value !== 'object') return false;
    const context = value as Record<string, unknown>;
    return (
        typeof context.serverHost === 'string' &&
        typeof context.serverPort === 'number' &&
        typeof context.roomId === 'string' &&
        typeof context.roomHandle === 'string' &&
        typeof context.profileId === 'string' &&
        typeof context.displayName === 'string' &&
        typeof context.joinToken === 'string' &&
        (context.codec === 'opus' || context.codec === 'pcm') &&
        typeof context.frames === 'number' &&
        (context.broadcastIpcPort === undefined || typeof context.broadcastIpcPort === 'number')
    );
}

function isBroadcastLaunchContext(value: unknown): value is JamBroadcastLaunchContext {
    if (!value || typeof value !== 'object') return false;
    const context = value as Record<string, unknown>;
    return (
        typeof context.roomId === 'string' &&
        typeof context.ipcPort === 'number' &&
        typeof context.srtUrl === 'string' &&
        typeof context.hlsUrl === 'string'
    );
}

function buildJamClientArgs(context: JamClientLaunchContext) {
    const args = [
        '--server', context.serverHost,
        '--port', String(context.serverPort),
        '--room', context.roomId,
        '--room-handle', context.roomHandle,
        '--user-id', context.profileId,
        '--display-name', context.displayName,
        '--join-token', context.joinToken,
        '--codec', context.codec,
        '--frames', String(context.frames),
    ];
    if (context.broadcastIpcPort && context.broadcastIpcPort > 0) {
        args.push('--broadcast-ipc-port', String(context.broadcastIpcPort));
    }
    return args;
}

function buildJamBroadcastArgs(context: JamBroadcastLaunchContext) {
    return [
        '--ipc-port', String(context.ipcPort),
        '--srt-url', context.srtUrl,
    ];
}

function getJamBroadcastStatus() {
    if (broadcasterProcess && broadcasterProcess.exitCode === null) {
        return {
            state: jamBroadcastState,
            exitCode: null,
            error: jamBroadcastError,
            hlsUrl: jamBroadcastHlsUrl,
        };
    }
    return {
        state: jamBroadcastState,
        exitCode: jamBroadcastExitCode,
        error: jamBroadcastError,
        hlsUrl: jamBroadcastHlsUrl,
    };
}

function stopProcessTree(processToStop: ChildProcess | null) {
    if (!processToStop || processToStop.exitCode !== null || !processToStop.pid) {
        return;
    }
    if (isWindows) {
        spawn('taskkill', ['/pid', String(processToStop.pid), '/t', '/f'], {
            stdio: 'ignore',
            windowsHide: true,
        });
        return;
    }
    try {
        processToStop.kill('SIGTERM');
    } catch {
        // Process may have already exited.
    }
}

const PRESENCE_DISCONNECT_REQUEST_TIMEOUT_MS = 700;
const PRESENCE_BACKGROUND_QUIT_DELAY_MS = 500;

let presenceSessionToken: string | null = null;
let presenceConvexUrl: string | null = null;

/**
 * Handle deep links (e.g., jam://profile/123 or https://yourapp.com/#/profile/123)
 * Converts protocol URLs to internal navigation paths
 */
function handleDeepLink(window: BrowserWindow, url: string) {
    try {
        const parsedUrl = new URL(url);
        let path = '';

        if (parsedUrl.protocol === 'jam:') {
            // Custom protocol: jam://profile/123 → /profile/123
            // Combine hostname and pathname with leading slash
            const hostname = parsedUrl.hostname || '';
            const pathname = parsedUrl.pathname || '';
            path = '/' + hostname + pathname;
        } else if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            // HTTP/HTTPS with HashRouter: https://yourapp.com/#/profile/123 → /profile/123
            if (parsedUrl.hash) {
                // Remove the leading '#' from hash
                path = parsedUrl.hash.substring(1);
            } else {
                // Fallback to pathname if no hash
                path = parsedUrl.pathname === '/' ? '/feed' : parsedUrl.pathname;
            }
        }

        if (path && path !== '/') {
            // Send navigation command to renderer process
            window.webContents.send('navigate', path);
            console.log('[Deep Link] Navigating to:', path);
        }
    } catch (error) {
        console.error('[Deep Link] Failed to parse URL:', url, error);
    }
}

// Protocol handler for deep links (e.g., jam://profile/123)
// This allows "Open in App" functionality
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('jam', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('jam');
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Another instance is already running, exit this one
    app.quit();
} else {
    // Handle second instance attempts - focus the existing window and handle deep links
    app.on('second-instance', (_event, commandLine) => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            const mainWindow = windows[0];
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            // Handle deep link from second instance (Windows/Linux)
            const url = commandLine.find(arg => arg.startsWith('jam://'));
            if (url) {
                handleDeepLink(mainWindow, url);
            }
        }
    });

    let mainWindow: BrowserWindow | null = null;

    // IPC handler for opening external links
    ipcMain.handle('open-external', async (_event, url: string) => {
        try {
            const parsedUrl = new URL(url);

            // Only allow HTTP/HTTPS links
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                await shell.openExternal(url);
                return { success: true };
            } else {
                return { success: false, error: 'Only HTTP/HTTPS URLs are allowed' };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Invalid URL'
            };
        }
    });

    // IPC handler for launching the native jam client with product-issued context.
    ipcMain.handle('launch-jam-client', async (_event, context: unknown) => {
        try {
            if (!isLaunchContext(context)) {
                jamClientState = 'failed';
                jamClientError = 'Invalid native jam launch context';
                return { success: false, error: jamClientError, state: jamClientState };
            }

            if (clientProcess) {
                try {
                    if (clientProcess.exitCode === null && clientProcess.pid) {
                        return { success: false, error: 'Client is already running', state: jamClientState };
                    }
                } catch {
                    clientProcess = null;
                }
            }

            const clientPath = getClientExecutablePath();
            if (!existsSync(clientPath)) {
                jamClientState = 'failed';
                jamClientError = `Client executable not found at ${clientPath}`;
                return { success: false, error: jamClientError, state: jamClientState };
            }

            jamClientState = 'launching';
            jamClientExitCode = null;
            jamClientError = undefined;
            clientProcess = spawn(clientPath, buildJamClientArgs(context), {
                detached: true,
                stdio: 'ignore',
            });
            jamClientState = 'running';

            clientProcess.on('exit', (code) => {
                jamClientState = 'exited';
                jamClientExitCode = code;
                clientProcess = null;
            });

            clientProcess.on('error', (error) => {
                jamClientState = 'failed';
                jamClientError = error.message;
                clientProcess = null;
            });

            clientProcess.unref();

            return { success: true, state: jamClientState };
        } catch (error) {
            clientProcess = null;
            jamClientState = 'failed';
            jamClientError = error instanceof Error ? error.message : 'Unknown error';
            return { 
                success: false, 
                error: jamClientError,
                state: jamClientState,
            };
        }
    });

    ipcMain.handle('get-jam-client-status', async () => {
        if (clientProcess && clientProcess.exitCode === null) {
            return { state: jamClientState, exitCode: null, error: jamClientError };
        }
        return { state: clientProcess ? jamClientState : jamClientState, exitCode: jamClientExitCode, error: jamClientError };
    });

    ipcMain.handle('launch-jam-broadcast', async (_event, context: unknown) => {
        try {
            if (!isBroadcastLaunchContext(context)) {
                jamBroadcastState = 'failed';
                jamBroadcastError = 'Invalid native broadcast launch context';
                return { success: false, ...getJamBroadcastStatus(), error: jamBroadcastError };
            }

            if (broadcasterProcess && broadcasterProcess.exitCode === null && broadcasterProcess.pid) {
                return { success: false, ...getJamBroadcastStatus(), error: 'Broadcaster is already running' };
            }

            const broadcasterPath = getBroadcasterExecutablePath();
            if (!existsSync(broadcasterPath)) {
                jamBroadcastState = 'failed';
                jamBroadcastError = `Broadcaster executable not found at ${broadcasterPath}`;
                return { success: false, ...getJamBroadcastStatus(), error: jamBroadcastError };
            }

            jamBroadcastState = 'launching';
            jamBroadcastExitCode = null;
            jamBroadcastError = undefined;
            jamBroadcastHlsUrl = context.hlsUrl;
            jamBroadcastStopRequested = false;
            broadcasterProcess = spawn(broadcasterPath, buildJamBroadcastArgs(context), {
                stdio: 'ignore',
                windowsHide: true,
            });
            jamBroadcastState = 'running';

            broadcasterProcess.on('exit', (code) => {
                jamBroadcastState = jamBroadcastStopRequested ? 'idle' : 'exited';
                jamBroadcastExitCode = code;
                jamBroadcastStopRequested = false;
                broadcasterProcess = null;
            });

            broadcasterProcess.on('error', (error) => {
                jamBroadcastState = 'failed';
                jamBroadcastError = error.message;
                broadcasterProcess = null;
            });

            return { success: true, ...getJamBroadcastStatus() };
        } catch (error) {
            broadcasterProcess = null;
            jamBroadcastState = 'failed';
            jamBroadcastError = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, ...getJamBroadcastStatus(), error: jamBroadcastError };
        }
    });

    ipcMain.handle('stop-jam-broadcast', async () => {
        if (!broadcasterProcess || broadcasterProcess.exitCode !== null) {
            broadcasterProcess = null;
            jamBroadcastState = 'idle';
            jamBroadcastExitCode = null;
            return { success: true, ...getJamBroadcastStatus() };
        }

        jamBroadcastState = 'stopping';
        jamBroadcastStopRequested = true;
        stopProcessTree(broadcasterProcess);
        broadcasterProcess = null;
        jamBroadcastState = 'idle';
        jamBroadcastExitCode = null;
        return { success: true, ...getJamBroadcastStatus() };
    });

    ipcMain.handle('get-jam-broadcast-status', async () => getJamBroadcastStatus());

    // Save theme preference so next launch uses correct background color
    ipcMain.handle('save-theme', (_event, theme: 'dark' | 'light') => {
        try {
            writeFileSync(path.join(app.getPath('userData'), 'theme.json'), JSON.stringify({ theme }));
        } catch { /* non-critical */ }
    });

    // Update Windows titleBarOverlay symbol color when theme changes (bg stays transparent)
    ipcMain.handle('update-title-bar-overlay', (_event, theme: 'dark' | 'light') => {
        if (!isWindows || !mainWindow || mainWindow.isDestroyed()) return;
        try {
            mainWindow.setTitleBarOverlay({
                color: OVERLAY_BG,
                symbolColor: OVERLAY_SYMBOL[theme],
            });
        } catch { /* non-critical: overlay update failed */ }
    });

    // Cache the latest presence session state so main can send non-blocking disconnect on app close.
    ipcMain.on('presence-session-state', (_event, payload: { sessionToken: string | null; convexUrl?: string | null }) => {
        presenceSessionToken = payload.sessionToken ?? null;
        if (payload.convexUrl) {
            presenceConvexUrl = payload.convexUrl;
        }
    });

    app.on('ready', () => {
        const preloadPath = isDev()
            ? path.join(process.cwd(), 'dist-electron', 'preload.js')
            : path.join(__dirname, 'preload.js');

        // Configure Content Security Policy
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // React needs unsafe-eval in dev
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: https:; " + // Allow images from HTTPS sources
                        "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.r2.cloudflarestorage.com https://*.welor.fun http://*.welor.fun:* http://localhost:* ws://localhost:*; " + // Convex + R2 uploads + media CDN + HLS + dev server
                        "media-src 'self' https: http: blob:; " + // Allow HLS video streams
                        "font-src 'self' data:; " +
                        "object-src 'none'; " + // Block plugins
                        "base-uri 'self'; " + // Prevent base tag hijacking
                        "form-action 'self'; " + // Only submit forms to same origin
                        "frame-ancestors 'none';" // Prevent clickjacking
                    ]
                }
            });
        });

        mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 384,
            minHeight: 216,
            show: false, // Don't show until ready
            backgroundColor: THEME_BG[getSavedTheme()],
            autoHideMenuBar: process.platform !== 'darwin', // Hide menu on Windows/Linux, keep on macOS
            // Custom titlebar — native controls, no chrome
            ...(isMac && {
                titleBarStyle: 'hiddenInset' as const,
                trafficLightPosition: { x: 16, y: 14 },
            }),
            ...(isWindows && {
                titleBarStyle: 'hidden' as const,
                titleBarOverlay: {
                    color: OVERLAY_BG,
                    symbolColor: OVERLAY_SYMBOL[getSavedTheme()],
                    height: 36,
                },
            }),
            webPreferences: {
                preload: preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                // Ensure auth cookies persist across app restarts
                partition: 'persist:jam-desktop',
                // Keep timers active while minimized/hidden so presence heartbeats continue.
                backgroundThrottling: false,
                webSecurity: true, // Enable web security
                allowRunningInsecureContent: false, // Block mixed content
            },
        });

        let isAppQuitting = false;
        let isBackgroundCloseInProgress = false;
        let quitTimeoutId: NodeJS.Timeout | null = null;

        app.on('before-quit', () => {
            isAppQuitting = true;
            stopProcessTree(broadcasterProcess);
            broadcasterProcess = null;
            if (quitTimeoutId) {
                clearTimeout(quitTimeoutId);
                quitTimeoutId = null;
            }
        });

        mainWindow.on('close', (event) => {
            if (isAppQuitting) return;
            event.preventDefault();

            if (isBackgroundCloseInProgress || !mainWindow || mainWindow.isDestroyed()) {
                return;
            }

            isBackgroundCloseInProgress = true;

            // Close instantly from the user's perspective.
            mainWindow.hide();

            // Fire-and-forget graceful disconnect from main process.
            void sendPresenceDisconnectInBackground();

            // Hard timeout to finish app shutdown without waiting for network completion.
            quitTimeoutId = setTimeout(() => {
                isAppQuitting = true;
                app.quit();
            }, PRESENCE_BACKGROUND_QUIT_DELAY_MS);
        });

        // Security: Lock down navigation - prevent navigating to external sites
        mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);

            // In dev, allow localhost. In production, only allow file protocol
            const allowedHosts = isDev() ? ['localhost', '127.0.0.1'] : [];
            const allowedProtocols = ['file:', 'devtools:'];

            if (!allowedHosts.includes(parsedUrl.hostname) && !allowedProtocols.includes(parsedUrl.protocol)) {
                event.preventDefault();
                console.warn('[Security] Navigation blocked:', navigationUrl);
            }
        });

        // Security: Handle external links - open in default browser instead of new window
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            // Parse URL to validate it
            try {
                const parsedUrl = new URL(url);

                // Only allow HTTP/HTTPS links to open externally
                if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                    // Open in user's default browser (secure)
                    shell.openExternal(url);
                    console.log('[Security] Opened external link in browser:', url);
                } else {
                    console.warn('[Security] Blocked non-HTTP link:', url);
                }
            } catch {
                console.warn('[Security] Invalid URL blocked:', url);
            }

            // Always deny opening in new Electron window
            return { action: 'deny' };
        });

        // Security: Disable remote content injection
        mainWindow.webContents.on('will-attach-webview', (event) => {
            event.preventDefault();
            console.warn('[Security] Webview attachment blocked');
        });

        // Custom application menu
        const menuTemplate: Electron.MenuItemConstructorOptions[] = [
            // macOS app menu (required — uses app name automatically)
            ...(isMac ? [{
                role: 'appMenu' as const,
            }] : []),
            // File
            {
                label: 'File',
                submenu: [
                    isMac ? { role: 'close' as const } : { role: 'quit' as const },
                ],
            },
            // Edit — keep for text input support (copy/paste/undo)
            { role: 'editMenu' as const },
            // View
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Toggle Theme',
                        accelerator: isMac ? 'Cmd+T' : 'Ctrl+T',
                        click: () => mainWindow?.webContents.send('toggle-theme'),
                    },
                    { type: 'separator' },
                    { role: 'reload' as const },
                    { role: 'forceReload' as const },
                    ...(isDev() ? [{ role: 'toggleDevTools' as const }] : []),
                    { type: 'separator' as const },
                    { role: 'resetZoom' as const },
                    { role: 'zoomIn' as const },
                    { role: 'zoomOut' as const },
                    { type: 'separator' as const },
                    { role: 'togglefullscreen' as const },
                ],
            },
            // Navigate
            {
                label: 'Navigate',
                submenu: [
                    {
                        label: 'Jams',
                        accelerator: isMac ? 'Cmd+1' : 'Ctrl+1',
                        click: () => mainWindow?.webContents.send('navigate', '/jams'),
                    },
                    {
                        label: 'Feed',
                        accelerator: isMac ? 'Cmd+2' : 'Ctrl+2',
                        click: () => mainWindow?.webContents.send('navigate', '/feed'),
                    },
                    {
                        label: 'Friends',
                        accelerator: isMac ? 'Cmd+3' : 'Ctrl+3',
                        click: () => mainWindow?.webContents.send('navigate', '/friends'),
                    },
                    {
                        label: 'Communities',
                        accelerator: isMac ? 'Cmd+4' : 'Ctrl+4',
                        click: () => mainWindow?.webContents.send('navigate', '/communities'),
                    },
                    {
                        label: 'Bands',
                        accelerator: isMac ? 'Cmd+5' : 'Ctrl+5',
                        click: () => mainWindow?.webContents.send('navigate', '/bands'),
                    },
                    {
                        label: 'My Music',
                        accelerator: isMac ? 'Cmd+6' : 'Ctrl+6',
                        click: () => mainWindow?.webContents.send('navigate', '/my-music'),
                    },
                ],
            },
            // Window
            {
                role: 'windowMenu' as const,
            },
        ];

        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);

        // Show window when ready to prevent white screen flash
        mainWindow.once('ready-to-show', () => {
            mainWindow?.show();
        });

        if (isDev()) {
            mainWindow.loadURL('http://localhost:5123');
        } else {
            mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html'));
        }
    });

    // Handle deep links on macOS
    app.on('open-url', (event, url) => {
        event.preventDefault();
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && windows[0]) {
            handleDeepLink(windows[0], url);
            if (windows[0].isMinimized()) windows[0].restore();
            windows[0].focus();
        }
    });
}

async function sendPresenceDisconnectInBackground() {
    if (!presenceSessionToken || !presenceConvexUrl) {
        return;
    }

    const sessionToken = presenceSessionToken;
    const convexUrl = presenceConvexUrl;
    // Clear token immediately to avoid duplicate disconnect attempts.
    presenceSessionToken = null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, PRESENCE_DISCONNECT_REQUEST_TIMEOUT_MS);

    try {
        await fetch(`${convexUrl}/api/mutation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: 'presence:disconnect',
                args: { sessionToken },
            }),
            signal: controller.signal,
        });
    } catch (error) {
        // Non-blocking shutdown: disconnect failures fall back to presence timeout cleanup.
        console.warn('[Presence] Background disconnect request failed:', error);
    } finally {
        clearTimeout(timeoutId);
    }
}
