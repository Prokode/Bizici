import { openai } from "./openai";

export const MAX_IMAGE_BASE64_LENGTH = 8 * 1024 * 1024;
const CANDIDATE_BATCH_SIZE = 8;
const MIN_VISUAL_CONFIDENCE = 0.62;
const MODEL = "gpt-5-mini";

export type VisualSearchImage = {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

export type VisualSearchCandidate = {
  id: string;
  photo: string;
};

export type RankedVisualMatch = {
  id: string;
  confidence: number;
};

export type ParsedVisualSearchImage =
  | { ok: true; image: VisualSearchImage }
  | { ok: false; status: 400 | 413; error: string };

const IMAGE_SIGNATURES = [
  {
    mimeType: "image/jpeg",
    matches: (bytes: Buffer) =>
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff,
  },
  {
    mimeType: "image/png",
    matches: (bytes: Buffer) =>
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    mimeType: "image/webp",
    matches: (bytes: Buffer) =>
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP",
  },
] as const;

export function parseVisualSearchImage(
  rawBase64: unknown,
  rawMimeType?: unknown,
): ParsedVisualSearchImage {
  if (typeof rawBase64 !== "string" || rawBase64.length === 0) {
    return { ok: false, status: 400, error: "imageBase64 is required" };
  }

  let base64 = rawBase64;
  let dataUrlMimeType: string | undefined;
  const dataUrlMatch = /^data:(image\/(?:jpeg|png|webp));base64,/i.exec(base64);
  if (dataUrlMatch) {
    dataUrlMimeType = dataUrlMatch[1]?.toLowerCase();
    base64 = base64.slice(dataUrlMatch[0].length);
  } else if (base64.startsWith("data:")) {
    return {
      ok: false,
      status: 400,
      error: "Only JPEG, PNG, and WebP images are supported",
    };
  }

  if (base64.length > MAX_IMAGE_BASE64_LENGTH) {
    return {
      ok: false,
      status: 413,
      error: "Image is too large; choose a smaller photo",
    };
  }
  if (
    base64.length === 0 ||
    base64.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      base64,
    )
  ) {
    return { ok: false, status: 400, error: "Invalid base64 image data" };
  }

  const bytes = Buffer.from(base64, "base64");
  const signature = IMAGE_SIGNATURES.find((entry) => entry.matches(bytes));
  if (!signature) {
    return {
      ok: false,
      status: 400,
      error: "Photo must be a valid JPEG, PNG, or WebP image",
    };
  }

  const declaredMimeType =
    typeof rawMimeType === "string" ? rawMimeType.toLowerCase() : undefined;
  if (
    (declaredMimeType && declaredMimeType !== signature.mimeType) ||
    (dataUrlMimeType && dataUrlMimeType !== signature.mimeType)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Image type does not match the photo data",
    };
  }

  return {
    ok: true,
    image: { base64, mimeType: signature.mimeType },
  };
}

function isPublicImageUrl(value: string): boolean {
  if (value.length > 2_000) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function parseRankings(
  content: string | null | undefined,
  allowedIds: Set<string>,
): RankedVisualMatch[] {
  if (!content) throw new Error("Visual matching returned an empty response");
  const jsonText = content.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) throw new Error("Visual matching returned invalid JSON");

  const parsed: unknown = JSON.parse(jsonText);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { matches?: unknown }).matches)
  ) {
    throw new Error("Visual matching response is missing matches");
  }

  const seen = new Set<string>();
  return (parsed as { matches: unknown[] }).matches.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { id, confidence } = item as {
      id?: unknown;
      confidence?: unknown;
    };
    if (
      typeof id !== "string" ||
      !allowedIds.has(id) ||
      seen.has(id) ||
      typeof confidence !== "number" ||
      !Number.isFinite(confidence)
    ) {
      return [];
    }

    const normalizedConfidence =
      confidence > 1 && confidence <= 100 ? confidence / 100 : confidence;
    if (
      normalizedConfidence < MIN_VISUAL_CONFIDENCE ||
      normalizedConfidence > 1
    ) {
      return [];
    }
    seen.add(id);
    return [{ id, confidence: normalizedConfidence }];
  });
}

export async function rankVisualCandidates(
  image: VisualSearchImage,
  candidates: VisualSearchCandidate[],
  hint?: string,
): Promise<RankedVisualMatch[]> {
  const usableCandidates = candidates.filter((candidate) =>
    isPublicImageUrl(candidate.photo),
  );
  const queryImageUrl = `data:${image.mimeType};base64,${image.base64}`;
  const ranked: RankedVisualMatch[] = [];

  for (
    let offset = 0;
    offset < usableCandidates.length;
    offset += CANDIDATE_BATCH_SIZE
  ) {
    const batch = usableCandidates.slice(offset, offset + CANDIDATE_BATCH_SIZE);
    const allowedIds = new Set(batch.map((candidate) => candidate.id));
    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "low" } }
    > = [
      {
        type: "text",
        text: [
          "The first image is the customer's reference photo.",
          "Compare it with each numbered candidate product photo that follows.",
          "Rank only products that are visibly similar in product type, shape, color, pattern, or distinctive details.",
          "Do not treat proximity, product names, or the optional hint as visual evidence.",
          "If none is clearly similar, return an empty matches array.",
          "Return JSON only in this shape: {\"matches\":[{\"id\":\"candidate id\",\"confidence\":0.0}]}",
          "Confidence must be a number from 0 to 1 reflecting visual similarity, not likelihood the item is nearby.",
          hint ? `Optional customer hint (secondary to the photo): ${hint.slice(0, 160)}` : "",
          "Reference photo:",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        type: "image_url",
        image_url: { url: queryImageUrl, detail: "low" },
      },
    ];

    for (const candidate of batch) {
      content.push({
        type: "text",
        text: `Candidate ID: ${candidate.id}`,
      });
      content.push({
        type: "image_url",
        image_url: { url: candidate.photo, detail: "low" },
      });
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a visual product matcher. Inspect the actual image pixels. Never claim similarity based only on a nearby shop or text. Be conservative and return no match when the images do not show the same kind of item or a clearly similar product.",
        },
        { role: "user", content },
      ],
    });

    ranked.push(
      ...parseRankings(response.choices[0]?.message?.content, allowedIds),
    );
  }

  return ranked.sort((a, b) => b.confidence - a.confidence);
}
