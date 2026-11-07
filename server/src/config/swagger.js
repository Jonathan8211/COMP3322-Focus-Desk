const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "FocusDesk API",
      version: "1.0.0",
      description:
        "FocusDesk task, project, and notes API.",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your access token obtained from /api/auth/login",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message" },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            user_id: { type: "integer", example: 1 },
            title: { type: "string", example: "Finish the monthly report" },
            description: { type: "string", example: "Report for the month of July" },
            status: { type: "string", enum: ["pending", "completed"], example: "pending" },
            priority: { type: "string", enum: ["low", "medium", "high"], example: "high" },
            due_date: { type: "string", format: "date", example: "2026-07-31" },
            project: { type: "string", example: "Work" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Work" },
            color: { type: "string", example: "#6366f1" },
            created_at: { type: "string", format: "date-time" },
          },
        },

      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/health": {
        get: {
          summary: "Check API availability",
          security: [],
          responses: { 200: { description: "API is available" } },
        },
      },
    },
  },
  apis: ["authRoutes.js", "taskRoutes.js", "projectRoutes.js", "noteRoutes.js"].map((file) => path.join(__dirname, "../routes", file)),
};

module.exports = swaggerJsdoc(options);
