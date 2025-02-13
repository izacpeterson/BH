import express from "express";
import { exec } from "child_process";

const app = express();
const port = 3000;

app.get("/logs/:process?", (req, res) => {
  const processName = req.params.process || "all"; // Default to all logs
  exec(
    `pm2 logs ${processName} --lines 100 --nostream`,
    (err, stdout, stderr) => {
      if (err || stderr) {
        res
          .status(500)
          .json({ error: "Error retrieving PM2 logs", details: stderr });
        return;
      }

      // Parse log output into JSON
      const logEntries = stdout
        .split("\n")
        .filter((line) => line.trim() !== "") // Remove empty lines
        .map((line) => {
          const match = line.match(/\[(.*?)\]\s([A-Za-z]+):\s(.+)/); // Extract timestamp, type, and message
          if (match) {
            return {
              timestamp: match[1],
              type: match[2],
              message: match[3],
            };
          }
          return { raw: line }; // Fallback for unstructured logs
        });

      res.json(logEntries);
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
