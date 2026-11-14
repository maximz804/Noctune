# NOCTUNE Portable 0.2

Dark purple music dashboard, based on the original NOCTUNE HTML design. Includes a Windows mini-player button that keeps the official YouTube video visible.

## Build one portable Windows EXE without installing Node on your laptop

1. Create a new empty GitHub repository.
2. Upload **the contents** of this ZIP to the repository root (not the enclosing folder). The hidden `.github/workflows/windows.yml` must be preserved.
3. Open **Actions → Build NOCTUNE Portable EXE → Run workflow**.
4. When the run succeeds, download the `NOCTUNE-Portable-Windows` artifact. Inside is `NOCTUNE-Portable-0.2.0.exe`.

You do not need administrator privileges or Node.js locally. Managed computers may still block untrusted executables.

## Music

In Settings, enter your own YouTube Data API v3 key to search. YouTube's official visible embedded player is used for playback. API usage has free quota limits. Do not commit your API key to GitHub.

## Mini player

Click **Mini player** at top right to resize the same window into a floating player near the top of the screen. Click **Grote app** to restore. Playback remains in the same window. The embedded YouTube video remains visible in mini mode.

## Status

This is source code + an automated build workflow, **not a precompiled or tested Windows EXE**.
