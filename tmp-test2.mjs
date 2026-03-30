import { GoogleGenAI } from "@google/genai";

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: "AIzaSyB6qnn8tLK32Rjl3p6w03IPcSkjIKx9n_c" });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyB6qnn8tLK32Rjl3p6w03IPcSkjIKx9n_c`);
    const data = await response.json();
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name));
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
