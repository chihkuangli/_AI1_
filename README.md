<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AI 會議記錄生成與翻譯工具

這是一個基於 `React` + `Vite` + `Express` 的 TypeScript 專案，適合部署到一般 Node/Express 伺服器。

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create a `.env` file at the project root with your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
3. Run the app in development mode:
   `npm run dev`

## Build and Start

1. Build the frontend and server bundle:
   `npm run build`
2. Start the production server:
   `npm start`

## Notes

- `PORT` is optional. If not set, the server defaults to `3000`.
- `.env` is ignored by Git, so your secret key stays local.
