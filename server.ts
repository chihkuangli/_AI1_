import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure JSON parser to handle large raw transcripts safely
  app.use(express.json({ limit: "15mb" }));

  // Initialize the server-side Gemini SDK client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // API endpoint to process the transcript
  app.post("/api/generate", async (req, res) => {
    try {
      const { transcript, language, style, mode } = req.body;

      if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
        return res.status(400).json({ error: "請輸入或貼上會議逐字稿內容。" });
      }

      if (!apiKey) {
        return res.status(500).json({
          error: "伺服器未檢測到 GEMINI_API_KEY。請回至 AI Studio 的 Settings -> Secrets 面板進行金鑰配置，重啟應用後再試。"
        });
      }

      // Configure precise and highly structured SYSTEM INSTRUCTIONS as requested
      const SYSTEM_INSTRUCTIONS = `你是一位專業的會議記錄助理。請根據使用者提供的會議逐字稿，整理出結構化的會議紀錄。
請務必遵守以下輸出格式要求：

1. **會議主題與時間**：擷取會議的主題與時間。
2. **與會者**：列出參與會議的人員。
3. **會議重點總結**：用 3 到 5 個重點總結會議內容。
4. **Action Items (待辦事項)**：明確列出接下來的待辦事項與負責人。
5. **英文翻譯版**：將上述 1~4 點的內容完整翻譯成專業的英文。

請以 Markdown 格式輸出，所有繁體中文部分必須使用**繁體中文**回覆，不要包含任何額外的問候語或結語。`;

      let userPrompt = `以下是需要處理的會議逐字稿：\n\n${transcript}`;
      
      if (mode === "only-summary") {
        userPrompt += `\n\n[規格要求]：請生成第 1 至 4 點的繁體中文會議紀錄（採用「${style}」風格撰寫），本處理模式無須包含第 5 點的英文翻譯對照版。`;
      } else if (mode === "only-translate") {
        userPrompt += `\n\n[規格要求]：請跳過前 4 點的摘要結構，純粹將以上會議內容直接高品質、語句通順地翻譯為【${language}】，並做好段落排版。`;
      } else {
        // summary-and-translate
        if (language && !language.includes("英文")) {
          userPrompt += `\n\n[規格要求]：請生成上述 1 至 4 點的結構化繁體中文會議紀錄（採用「${style}」風格撰寫），並將第 5 點的「英文翻譯版」語言調整為專業優質的【${language}】。`;
        } else {
          userPrompt += `\n\n[規格要求]：請整理出上述 1 到 5 點的結構化會議記錄，並將總結採用「${style}」風格。第 5 點如常為專業英文翻譯對照。`;
        }
      }

      // Execute the generateContent call to gemini-3.5-flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          temperature: 0.3, // more focused and formatting-compliant output
        },
      });

      const resultText = response.text || "AI 連線成功但未能產生具體回覆。";
      return res.json({ result: resultText });
    } catch (err: any) {
      console.error("Gemini server error: ", err);
      return res.status(500).json({ error: `AI 處理異常：${err.message || err}` });
    }
  });

  // Load Vite middleware in dev, otherwise render static production files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server listening on port ${PORT}`);
  });
}

startServer();
