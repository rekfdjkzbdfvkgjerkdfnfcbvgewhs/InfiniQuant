import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { spawn } from "child_process";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze", (req, res) => {
    try {
      const pythonProcess = spawn("python3", ["api/analyze.py"], {
        env: { ...process.env }
      });

      let dataString = "";
      let errorString = "";

      pythonProcess.stdout.on("data", (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorString += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error("Python script exited with code", code, errorString);
          return res.status(500).json({ error: "Failed to analyze data" });
        }
        try {
          const result = JSON.parse(dataString);
          res.json(result);
        } catch (e) {
          console.error("Failed to parse Python output", dataString);
          res.status(500).json({ error: "Invalid response from analysis engine" });
        }
      });

      pythonProcess.stdin.write(JSON.stringify(req.body));
      pythonProcess.stdin.end();

    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to start analysis engine" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
