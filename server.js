import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 4000;

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// SPA fallback — always serve index.html
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`mnemo-ui  http://localhost:${PORT}`));
