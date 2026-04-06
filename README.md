# AI Metaverse Market Plaza

This version is a walkable 3D lobby built for static hosting.
It is designed to work well on GitHub Pages, with a central live market board, surrounding plaza, arches, and visible avatars.

## What changed

- Real 3D lobby instead of a flat mockup
- Mouse or touch look around support
- Keyboard or mobile button movement
- Central in-world market board
- Visible avatar placeholders around the plaza
- Static-hosting friendly structure for GitHub Pages

## Files

- `index.html`: full page structure, HUD, and live market board
- `styles.css`: HUD styling, board styling, and mobile controls
- `app.js`: Three.js scene, movement, camera, avatars, and plaza generation

## Deployment

Use GitHub Pages or any static web host.

Important:
- Because the app uses ES modules and CDN imports, it should be served over HTTP or HTTPS
- GitHub Pages is a good fit
- Opening the file directly with `file://` may be blocked by browser module rules

## Controls

- Desktop: drag to look around, `W A S D` or arrow keys to move
- Mobile: drag to look around, on-screen buttons to move

## Live market data

The central board uses TradingView embedded widgets, so an internet connection is required for the latest market information to appear.
