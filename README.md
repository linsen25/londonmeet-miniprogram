# LondonMeet Miniprogram

WeChat mini program client for LondonMeet.

## Requirements

- WeChat Developer Tools
- Node.js and npm

## Setup

```powershell
npm install
```

Open this repository directory directly in WeChat Developer Tools, then run **Tools → Build npm** if dependencies need rebuilding.

The private developer-tool file `project.private.config.json` is intentionally ignored.

## Configuration

The API base URL is configured in `utils/request.js`. For production, point it to the deployed HTTPS backend domain and add that domain to the WeChat Mini Program request-domain allowlist.

## Documentation

Project notes, requirements and diagrams are stored in [`docs`](./docs).

## Release

This repository is self-contained. Upload the mini program from this repository only; the backend and admin console are maintained in separate repositories.
