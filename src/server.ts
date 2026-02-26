import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import messagesRouter from "./routes/messages.js";
import { errorHandler, notFoundHandler } from "./utils/errors.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  // eslint-disable-next-line no-console
  console.log(`[REQ] ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);

  _res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`[RES] ${req.method} ${req.originalUrl} ${_res.statusCode} - ${durationMs}ms`);
  });

  next();
});

app.use(messagesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
