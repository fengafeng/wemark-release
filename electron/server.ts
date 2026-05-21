import fs from 'node:fs';
import path from 'node:path';
import { logger } from './utils/logger';

/**
 * Start the embedded Nitro server inside the Electron main process.
 *
 * In production, the Nuxt build output (`.output/public`) is served by
 * Nitro's built-in static file serving. We use `createServer` from the
 * Nitro production bundle and listen on a dynamic port.
 *
 * @returns The actual port the server is listening on.
 */
export async function startNitroServer(): Promise<number> {
  // Resolve the Nitro server entry from the Nuxt build output
  const serverEntryPath = path.join(
    process.resourcesPath,
    'app',
    '.output',
    'server',
    'index.mjs',
  );

  // Validate that the server entry file exists before attempting to import
  if (!fs.existsSync(serverEntryPath)) {
    throw new Error(
      `Nitro server entry not found at ${serverEntryPath}. The application may not have been built correctly.`,
    );
  }

  logger.info(`[Electron/Server] Loading Nitro server from: ${serverEntryPath}`);

  let nitroServer: { listen: (port: number, opts?: { host?: string }) => Promise<{ port: number }> };
  try {
    // Dynamic import of the Nitro production server
    nitroServer = await import(serverEntryPath);
  } catch (error) {
    logger.error('[Electron/Server] Failed to import Nitro server entry:', error);
    throw new Error(
      `Failed to load Nitro server from ${serverEntryPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Start listening on localhost only (security: prevent LAN access to internal APIs)
  try {
    const listener = await nitroServer.listen(0, { host: '127.0.0.1' });
    const actualPort = listener.port;
    logger.info(`[Electron/Server] Nitro server listening on 127.0.0.1:${actualPort}`);
    return actualPort;
  } catch (error) {
    logger.error('[Electron/Server] Failed to start Nitro server:', error);
    throw new Error(
      `Nitro server listen failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
