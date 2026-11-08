require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { testConnection } = require("./config/database");
const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "validator.swagger.io"],
    },
  },
}));
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => res.json({ success: true, service: "FocusDesk" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/daily-entries", require("./routes/dailyEntryRoutes"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "FocusDesk API" }));
app.use(errorHandler);

const startServer = async () => {
  await testConnection();
  app.listen(port, () => console.log(`FocusDesk API listening on ${port}`));
};

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
