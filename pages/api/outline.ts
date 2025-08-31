// pages/api/outline.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { keyword, serpResults, targetWords = 3000 } = req.body || {};
  if (!keyword || !Array.isArray(serpResults)) {
    return res.status(400).json({ error: "keyword と serpResults が必要です" });
  }

  try {
    const top = serpResults.slice(0, 10).map((r: any) => ({
      rank: r.rank,
      title: String(r.title || "").slice(0, 80),
      url: r.url,
    }));

    const system =
      "あなたはSEO編集者です。与えられたSERPとキーワードから、読者にとって分かりやすく重複のない見出し構成（H2/H3/H4）を日本語で作ります。";
    const user = [
      `キーワード: ${keyword}`,
      `目標文字数: 約${targetWords}文字`,
      "SERP上位（タイトルとURL）:",
      ...top.map((r) => `- ${r.rank}. ${r.title} | ${r.url}`),
      "",
      "要件:",
      "- 出力はJSONのみ。日本語。三点リーダ等で省略しない。",
      "- H2は4〜6個、各H2のH3は2〜4個、H3のH4は2〜4個で作成。",
      "- H2は導入/実践/注意/事例/FAQ/まとめ等から適切に選択し、網羅性と導線を意識。",
      "- H3/H4はSERPで頻出のトピックや関連KWを反映。重複を避け、見出しだけで内容が分かる具体性を保つ。",
      "",
      "JSONスキーマ:",
      `{
  "h2": [
    { "title": "H2タイトル",
      "h3": [
        { "title": "H3タイトル", "h4": ["H4-1", "H4-2"] }
      ]
    }
  ],
  "targetWords": 3000
}`,
      "上記スキーマどおりに JSON のみ返してください。",
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content || "{}";
    const json = JSON.parse(raw);
    return res.status(200).json(json);
  } catch (e: any) {
    console.error("outline api error:", e?.message || e);
    return res.status(500).json({ error: "outline_failed", detail: e?.message || String(e) });
  }
}
