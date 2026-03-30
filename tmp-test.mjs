import { GoogleGenAI } from "@google/genai";
console.log(Object.keys(GoogleGenAI));
try {
  const ai = new GoogleGenAI({ apiKey: "dummy_key" });
  console.log("Init success!");
  await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: ["Hello"],
  });
} catch (e) {
  console.error("Error:", e.message);
}
