import { z } from "zod";

// Property analysis request schema
export const propertyAnalysisRequestSchema = z.object({
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .regex(/,/, "Address must include city and state (e.g., '123 Main St, San Francisco, CA')"),
});

// Risk category schema for scoring breakdown
export const riskCategorySchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum(["Low Risk", "Medium Risk", "High Risk"]),
  description: z.string(),
});

// Risk factor schema
export const riskFactorSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum(["Poor", "Average", "Good", "Excellent"]),
});

// Property analysis result schema
export const propertyAnalysisResultSchema = z.object({
  id: z.string(),
  address: z.string(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(["Low Risk", "Medium Risk", "High Risk"]),
  riskCategory: z.enum(["low", "medium", "high"]),
  description: z.string(),
  riskCategories: z.array(riskCategorySchema),
  riskFactors: z.array(riskFactorSchema),
  analyzedAt: z.date(),
});

export const insertPropertyAnalysisRequestSchema = propertyAnalysisRequestSchema;

export type PropertyAnalysisRequest = z.infer<typeof propertyAnalysisRequestSchema>;
export type RiskCategory = z.infer<typeof riskCategorySchema>;
export type RiskFactor = z.infer<typeof riskFactorSchema>;
export type PropertyAnalysisResult = z.infer<typeof propertyAnalysisResultSchema>;
export type InsertPropertyAnalysisRequest = z.infer<typeof insertPropertyAnalysisRequestSchema>;
