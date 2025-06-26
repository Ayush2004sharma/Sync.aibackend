// services/gemini.service.js
import removeMarkdown from "remove-markdown";


import { GoogleGenerativeAI } from "@google/generative-ai";

import Project from '../models/project.model.js'; // adjust path if needed

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


export const generateGeminiResponse = async (message) => {
  if (!message) throw new Error("Prompt is required");
  
  const instruction = `You are a AI Assistant and experience in React Development.
  GUIDELINES:
  - Tell user what your are building
  - response less than 15 lines. 
  - Skip code examples and commentary`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "text/plain"
    }
  });

  const result = await model.generateContent(`${instruction}\n\nUser: ${message}`);
  const text = await result.response.text();
  return text;
};


export const generateProjectName = async (message) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 10,
      temperature: 0.75,
    },
  });

  const prompt = `Provide exactly one concise project name based on this message. Return only the name without quotes, punctuation, or any extra text.\nMessage:\n"${message}"\nProject name:`;

  const result = await model.generateContent(prompt);
  const rawText = await result.response.text();

  let baseName = removeMarkdown(rawText).trim();
  baseName = baseName.replace(/[:.!,]+$/g, "");
  baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  let finalName = baseName;
  let count = 1;

  // Check if project with this name exists
  while (await Project.findOne({ name: finalName })) {
    finalName = `${baseName} (${count})`;
    count++;
  }

  return finalName;
};


//working function

// export const generateProjectCodeStructure = async (message) => {

//   const model = genAI.getGenerativeModel({
//     model: "gemini-1.5-flash", // or 1.5-pro if available
//     generationConfig: {
//       responseMimeType: "application/json",
//       temperature: 0.75,
//       maxOutputTokens: 8192,
//     },
//   });

//   const result = await model.generateContent(message);
//   const text = await result.response.text();

//   try {
//     const parsed = JSON.parse(text);
//     return parsed.files; // { "filename": "content", ... }
//   } catch (err) {
//     console.error("Failed to parse Gemini response as JSON:", text);
//     throw new Error("Invalid Gemini response format");
//   }
// };

//working with history

// export const generateProjectCodeStructure = async (message, history) => {
//   const model = genAI.getGenerativeModel({
//     model: "gemini-1.5-flash",
//     generationConfig: {
//       responseMimeType: "application/json",
//       temperature: 0.4,
//     },
//   });

//   const chat = model.startChat({ history });

//   const result = await chat.sendMessage(message);
//   const response = await result.response;
//   const text = await response.text();

//   // 🔍 Try to extract JSON block from markdown-style or plain text
//   const match = text.match(/```json\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*\})/);
//   const rawJson = match?.[1] || match?.[2];

//   if (!rawJson) {
//     console.error("Full Gemini response:\n", text);
//     throw new Error("No valid JSON found in Gemini response");
//   }

//   let parsed;
//   try {
//     parsed = JSON.parse(rawJson);
//   } catch (err) {
//     console.error("Failed to parse JSON:\n", rawJson);
//     throw new Error("Gemini response JSON is invalid");
//   }

//   if (!parsed || typeof parsed !== "object" || !parsed.files) {
//     throw new Error("Invalid Gemini response: missing 'files' field.");
//   }

//   return parsed.files;
// };


export const generateProjectCodeStructure = async (message, history) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(message);
  const response = await result.response;
  const text = await response.text();

  // 🔍 Try to extract JSON
  const match = text.match(/```json\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*\})/);
  const rawJson = match?.[1] || match?.[2];

  if (!rawJson) {
    console.error("❌ No JSON block found. Full Gemini response:\n", text);
    throw new Error("No valid JSON found in Gemini response");
  }

  try {
    // Basic sanitation (removes trailing commas, replaces smart quotes)
    const cleanJson = rawJson
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[“”]/g, '"') // smart quotes
      .replace(/[‘’]/g, "'")
      .replace(/\u0000/g, '')          // remove null characters
    .trim();
    const parsed = JSON.parse(cleanJson);

    if (!parsed || typeof parsed !== "object" || !parsed.files) {
      throw new Error("Invalid Gemini response: missing 'files' field.");
    }

    return parsed.files;
  } catch (err) {
    console.error("❌ Failed to parse JSON. Raw block:\n", rawJson);
    throw new Error("Gemini response JSON is invalid");
  }
};
