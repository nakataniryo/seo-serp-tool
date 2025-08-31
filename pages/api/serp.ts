// pages/api/serp.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const q = String(req.query.q || "");
  if (!q) return res.status(200).json({ results: [] });

  // SerpAPI へサーバー側で中継
  const r = await fetch(
    `https://serpapi.com/search.json?engine=google&hl=ja&num=10&q=${encodeURIComponent(q)}&api_key=${process.env.SERP_API_KEY}`
  );

  if (!r.ok) {
    return res.status(r.status).send(await r.text()); // 404/401等を前段にそのまま返す
  }

  const data = await r.json();
  const results = (data.organic_results || []).map((x: any) => ({
    title: x.title,
    link: x.link,
  }));

  res.status(200).json({ results });
}
