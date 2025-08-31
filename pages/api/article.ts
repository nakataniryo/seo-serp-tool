// pages/api/article.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // .env.local に設定
});

type H4 = string;
type H3 = { title: string; h4: H4[] };
type H2 = { title: string; h3: H3[] };
type OutlineJSON = { h2: H2[]; targetWords?: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const {
      keyword,
      outline,
      targetWords = 3000,
      tone = "丁寧でわかりやすい、実務者向け",
      audience = "検索ユーザー（初学者〜中級者）",
      useTables = true,
    } = req.body as {
      keyword: string;
      outline: OutlineJSON;
      targetWords?: number;
      tone?: string;
      audience?: string;
      useTables?: boolean;
    };

    const outlineText = outline?.h2
      ?.map((h2) => {
        const h3s = (h2.h3 || [])
          .map((h3) => {
            const h4s = (h3.h4 || []).map((s) => `      - H4: ${s}`).join("\n");
            return `    - H3: ${h3.title}\n${h4s}`;
          })
          .join("\n");
        return `- H2: ${h2.title}\n${h3s}`;
      })
      .join("\n");

    const tableGuidance = useTables
      ? `
- 数値・料金・比較・仕様・メリット/デメリットなど**列のある情報**は、読み手が比較しやすいように **Markdown表** を用いることを強く推奨します。
- 表の直前に1～2文で「表の読み方」を補足してください。
- 表は空欄を作らず、必要がなければ無理に作らない（内容が薄い表は避ける）。
- 表の例（Markdown）：
  | 項目 | Aプラン | Bプラン |
  |---|---:|---:|
  | 料金(税抜) | 3,000円 | 3,500円 |
  | 最低契約期間 | なし | 12ヶ月 |
  `
      : `
- 表の使用は抑制してよいが、必要な場合は箇条書きや小見出しで分かりやすく整理してください。
  `;

    const system = `
あなたはSEO記事のプロライターです。検索ユーザーの課題を解決する、信頼性が高く読みやすい記事を**日本語**で執筆します。
トーン: ${tone}
読者像: ${audience}
文体: です/ます調。冗長な表現は避け、段落は短め、具体例と根拠を意識。
重要: 目標文字数は **約${targetWords}字（±10%）** を目安に、情報密度を最適化してください。
${tableGuidance}
    `.trim();

    const user = `
キーワード: ${keyword}

以下のアウトラインに従い、導入（リード）→各見出し本文→結論（まとめ）の順で**Markdown**として本文を書いてください。
アウトライン:
${outlineText}

要件:
- 見出しレベルは **H2/H3/H4** を順守（##, ###, ####）。
- 同じ内容の繰り返し・冗長表現を避け、固有名詞・具体例・数値を交えつつわかりやすく。
- 可能なら、各H2内に「要点の箇条書き」や「一言まとめ」を適宜入れてください。
- 生成するのは**本文のみ**（タイトルやメタ説明は不要）。コードブロックは使わず、通常のMarkdownで出力。
    `.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    });

    const markdown = completion.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ markdown });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "article_generation_failed" });
  }
}
