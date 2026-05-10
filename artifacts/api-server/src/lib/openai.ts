import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseURL || !apiKey) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY must be set to use AI features",
    );
  }
  _client = new OpenAI({ baseURL, apiKey });
  return _client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
});

export type ProductPhotoSuggestion = {
  name: string;
  category: string;
  price: number;
  tags: string[];
};

export async function analyzeProductPhoto(
  imageBase64: string,
): Promise<ProductPhotoSuggestion> {
  const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content:
          'You are an inventory assistant for a small market shop. Given a product photo, identify the product and respond ONLY with raw JSON (no prose, no markdown, no code fences) with these fields: name (short product name, max 40 chars), category (one of: Vêtements, Alimentation, Électronique, Maison & Déco, Beauté & Soins, Bijoux & Accessoires, Chaussures, Autre), price (estimated retail price as a number in EUR, no currency symbol), tags (array of 3-6 short lowercase searchable keywords customers might use to find this product, e.g. ["eau", "bouteille", "boisson"]).',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Identify this product." },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${cleaned}` },
          },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

  const name =
    typeof parsed?.name === "string" && parsed.name.length > 0
      ? parsed.name.slice(0, 60)
      : "Unknown product";
  const category =
    typeof parsed?.category === "string" && parsed.category.length > 0
      ? parsed.category
      : "Autre";
  const price =
    typeof parsed?.price === "number" && Number.isFinite(parsed.price)
      ? Math.max(0, parsed.price)
      : 0;
  const tags = Array.isArray(parsed?.tags)
    ? parsed.tags
        .filter((t: unknown): t is string => typeof t === "string")
        .map((t: string) => t.toLowerCase().trim())
        .filter((t: string) => t.length > 0)
        .slice(0, 8)
    : [];

  return { name, category, price, tags };
}
