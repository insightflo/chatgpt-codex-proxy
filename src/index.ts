import dotenv from "dotenv";
import app from "./server.js";

dotenv.config();

const PORT = Number(process.env.PORT ?? 8080);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`chatgpt-codex-proxy listening on port ${PORT}`);
});
