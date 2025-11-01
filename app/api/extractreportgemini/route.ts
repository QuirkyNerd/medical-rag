import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `Analyze this clinical report and extract all important medical information like patient details, test results, units, reference ranges, and give a brief summary of abnormalities.`;

// Use environment variable for API key
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey || apiKey === "your_google_api_key_here") {
  console.error("GOOGLE_API_KEY is not set or is placeholder");
}

// Initialize the Google Generative AI client
const genAI = apiKey && apiKey !== "your_google_api_key_here" ? new GoogleGenerativeAI(apiKey) : null;

// Use a v1-supported Gemini model
const model = genAI ? genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" }) : null;

export async function POST(req: Request) {
  if (!genAI || !model) {
    return new Response(
      JSON.stringify({ error: "Google API key not configured. Please set GOOGLE_API_KEY in your environment variables." }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  try {
    const { base64 } = await req.json();

    if (!base64 || !base64.startsWith("data:")) {
      throw new Error("Invalid or missing base64 image data.");
    }

    const [header, data] = base64.split(",");
    if (!header || !data) {
      throw new Error("Malformed base64 data.");
    }

    const mimeType = header.match(/:(.*?);/)?.[1];
    console.log("MIME type received:", mimeType);

    if (!mimeType || !mimeType.startsWith("image/")) {
      throw new Error("Only image MIME types are supported (e.g., image/jpeg, image/png)");
    }

    const filePart = {
      inlineData: {
        data: data,
        mimeType: mimeType,
      },
    };

    console.log("Using model: models/gemini-2.5-flash");

    // Call Gemini API with text + image
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            filePart,
          ],
        },
      ],
    });

    const textResponse = await result.response.text();

    console.log("Raw Gemini result:", result);
    console.log("Text response:", textResponse);

    if (!textResponse || textResponse.trim() === "") {
      throw new Error("Empty response from Gemini API");
    }

    return new Response(
      JSON.stringify({ result: textResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error during Gemini analysis:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
