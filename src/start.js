import { config } from "./config/app.js";
import app from "./app/index.js";

console.log("WebPanel config: port=%d host=%s", config.port, config.host);
console.log("Starting server...");
