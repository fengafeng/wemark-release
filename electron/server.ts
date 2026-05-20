import path from 'node:path';

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

  console.log(`[Electron/Server] Loading Nitro server from: ${serverEntryPath}`);

  let nitroServer: { listen: (port: number) => Promise<{ port: number }> };
  try {
    // Dynamic import of the Nitro production server
    nitroServer = await import(serverEntryPath);
  } catch (error) {
    console.error('[Electron/Server] Failed to import Nitro server entry:', error);
    throw new Error(
      `Failed to load Nitro server from ${serverEntryPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Start listening on a dynamic port (port 0 = OS assigns a free port)
  try {
    const listener = await nitroServer.listen(0);
    const actualPort = listener.port;
    console.log(`[Electron/Server] Nitro server listening on port ${actualPort}`);
    return actualPort;
  } catch (error) {
    console.error('[Electron/Server] Failed to start Nitro server:', error);
    throw new Error(
      `Nitro server listen failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
