import express from 'express';
import cors from 'cors';
import { runAudit } from './lighthouse-report.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/run-lighthouse', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const result = await runAudit(url);
    res.json(result);
  } catch (err) {
    console.error("Audit error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Lighthouse backend is running. POST /run-lighthouse with { url }');
});

app.listen(4000, () => {
  console.log("Backend running at http://localhost:4000");
});
