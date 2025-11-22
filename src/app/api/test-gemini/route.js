import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function GET() {
  try {
    console.log("[test-gemini] Probando conexión con Google Gemini...");

    // Informational: do not require GOOGLE_GENERATIVE_AI_API_KEY here. Some deployments
    // configure the provider differently (for example via Next/AI runtime config).
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log(`[test-gemini] GOOGLE_GENERATIVE_AI_API_KEY present: ${!!apiKey}`);

    // Probar con un modelo simple
    const modelName = process.env.GEMINI_MODEL || "models/gemini-2.5-flash";
    console.log(`[test-gemini] Probando modelo: ${modelName}`);

    const testPrompt = "Responde con solo 'OK' si puedes leerme.";

  let result;
    if (apiKey) {
      console.log('[test-gemini] GOOGLE_GENERATIVE_AI_API_KEY present -> using provider wrapper directly');
      const googleModel = google(modelName, { apiKey });
      result = await generateText({ model: googleModel, prompt: testPrompt, temperature: 0.1, maxTokens: 10 });
    } else {
      try {
        result = await generateText({ model: modelName, prompt: testPrompt, temperature: 0.1, maxTokens: 10 });
      } catch (errPlain) {
        console.warn('[test-gemini] Plain model name failed, retrying with provider wrapper', errPlain?.message || errPlain);
        const googleModel = google(modelName);
        result = await generateText({ model: googleModel, prompt: testPrompt, temperature: 0.1, maxTokens: 10 });
      }
    }

    console.log(`[test-gemini] Respuesta recibida: ${result.text}`);

    return NextResponse.json({
      status: "success",
      model: modelName,
      response: result.text,
      message: "Google Gemini está funcionando correctamente"
    });

  } catch (error) {
    console.error("[test-gemini] Error:", error);

    return NextResponse.json({
      status: "error",
      error: error.message,
      details: error.toString(),
      message: "Error al conectar con Google Gemini"
    }, { status: 500 });
  }
}
