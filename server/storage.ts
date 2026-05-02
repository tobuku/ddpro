import {
  type PropertyAnalysisResult,
  type InsertPropertyAnalysisRequest,
  type RiskFactor,
  type RiskCategory,
} from "../shared/schema.js";
import { randomUUID } from "crypto";

export interface IStorage {
  analyzeProperty(request: InsertPropertyAnalysisRequest): Promise<PropertyAnalysisResult>;
  getAnalysis(id: string): Promise<PropertyAnalysisResult | undefined>;
}

export class MemStorage implements IStorage {
  private analyses: Map<string, PropertyAnalysisResult>;

  constructor() {
    this.analyses = new Map();
  }

  async analyzeProperty(request: InsertPropertyAnalysisRequest): Promise<PropertyAnalysisResult> {
    const id = randomUUID();

    const marketRiskScore = Math.floor(Math.random() * 101);
    const locationRiskScore = Math.floor(Math.random() * 101);
    const propertyRiskScore = Math.floor(Math.random() * 101);

    const riskScore = Math.round((marketRiskScore + locationRiskScore + propertyRiskScore) / 3);

    const getRiskLevel = (score: number): "Low Risk" | "Medium Risk" | "High Risk" => {
      if (score >= 75) return "Low Risk";
      if (score >= 50) return "Medium Risk";
      return "High Risk";
    };

    const getRiskDescription = (score: number, category: string): string => {
      if (score >= 75) return `${category} shows excellent stability with minimal concerns.`;
      if (score >= 50) return `${category} has moderate factors that should be monitored.`;
      return `${category} presents significant challenges requiring careful attention.`;
    };

    const riskCategories: RiskCategory[] = [
      {
        name: "Market Risk",
        score: marketRiskScore,
        level: getRiskLevel(marketRiskScore),
        description: getRiskDescription(marketRiskScore, "Market conditions"),
      },
      {
        name: "Location Risk",
        score: locationRiskScore,
        level: getRiskLevel(locationRiskScore),
        description: getRiskDescription(locationRiskScore, "Location factors"),
      },
      {
        name: "Property Risk",
        score: propertyRiskScore,
        level: getRiskLevel(propertyRiskScore),
        description: getRiskDescription(propertyRiskScore, "Property conditions"),
      },
    ];

    const riskLevel = getRiskLevel(riskScore);
    let riskCategory: "low" | "medium" | "high";
    let description: string;

    if (riskScore >= 75) {
      riskCategory = "low";
      description =
        "This property shows strong investment potential with minimal risk factors across all categories.";
    } else if (riskScore >= 50) {
      riskCategory = "medium";
      description =
        "This property has moderate risk factors that should be carefully evaluated before investment.";
    } else {
      riskCategory = "high";
      description =
        "This property has significant risk factors that require thorough evaluation and mitigation strategies.";
    }

    const riskFactors: RiskFactor[] = [
      {
        name: "Market Stability",
        score: Math.floor(Math.random() * 41) + 60,
        level: Math.random() > 0.3 ? "Good" : "Excellent",
      },
      {
        name: "Location Score",
        score: Math.floor(Math.random() * 31) + 50,
        level: Math.random() > 0.5 ? "Average" : "Good",
      },
      {
        name: "Property Value",
        score: Math.floor(Math.random() * 21) + 70,
        level: Math.random() > 0.4 ? "Good" : "Excellent",
      },
    ];

    const analysis: PropertyAnalysisResult = {
      id,
      address: request.address,
      riskScore,
      riskLevel,
      riskCategory,
      description,
      riskCategories,
      riskFactors,
      analyzedAt: new Date(),
    };

    this.analyses.set(id, analysis);
    return analysis;
  }

  async getAnalysis(id: string): Promise<PropertyAnalysisResult | undefined> {
    return this.analyses.get(id);
  }
}

export const storage = new MemStorage();
