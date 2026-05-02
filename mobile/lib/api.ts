import type { PropertyAnalysisResult } from "../../shared/schema";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  console.warn("EXPO_PUBLIC_API_URL is not set. API calls will fail.");
}

export async function analyzeProperty(address: string): Promise<PropertyAnalysisResult> {
  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  // analyzedAt comes back as a string from JSON; convert to Date
  return { ...data, analyzedAt: new Date(data.analyzedAt) };
}

export async function getAnalysis(id: string): Promise<PropertyAnalysisResult> {
  const response = await fetch(`${BASE_URL}/api/analyze/${id}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  return { ...data, analyzedAt: new Date(data.analyzedAt) };
}
