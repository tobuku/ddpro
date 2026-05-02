import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { propertyAnalysisRequestSchema } from "../shared/schema.js";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    try {
      const validatedData = propertyAnalysisRequestSchema.parse(req.body);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result = await storage.analyzeProperty(validatedData);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid request data",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      } else {
        console.error("Analysis error:", error);
        res.status(500).json({ message: "Failed to analyze property. Please try again." });
      }
    }
  });

  app.get("/api/analyze/:id", async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        res.status(404).json({ message: "Analysis not found" });
        return;
      }
      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ message: "Failed to retrieve analysis" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
