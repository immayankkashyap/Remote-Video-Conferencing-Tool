import dotenv from "dotenv";
dotenv.config();

import http from "http";
import cors from "cors";
import express from "express";

import { initSocket } from "./socket";
import { uploadRouter } from "./routes/upload";


const app = express();
const server = http.createServer(app);

const port = Number(process.env.PORT) || 5000;
const rawFrontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const frontendUrl = rawFrontendUrl.replace(/\/+$/, "");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, "");
      if (cleanOrigin === frontendUrl) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use("/api", uploadRouter);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

initSocket(server);

server.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
  console.log(`CORS enabled for ${frontendUrl}`);
});
