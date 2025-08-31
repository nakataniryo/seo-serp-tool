import React, { useEffect, useRef, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

/** ===== Types ===== */
type SERPItem = { rank: number; title: string; url: string };
type H4 = string;
type H3 = { title: string; h4: H4[] };
type H2 = { title: string; h3: H3[] };
type OutlineJSON = { h2: H2[]; targetWords?: number };

/** ===== Component ===== */
export default function SeoTool() {
  const [keyword, setKeyword] = useState("");
  const [serp, setSerp] = useState<SERPItem[]>([]);
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpErr, setSerpErr] = useState("");

  const [outline, setOutline] = useState<OutlineJSON>({ h2: [], targetWords: 4500 });
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenDone, setRegenDone] = useState(false);

  // 本文生成
  const [articleMd, setArticleMd] = useState("");
  const [articleBusy, setArticleBusy] = useState(false);
  const [articleErr, setArticleErr] = useState("");

  // 本文生成オプション
  const [targetWords, setTargetWords] = useState<number>(outline.targetWords ?? 3000);
  const [useTables, setUseTables] = useState<boolean>(true);

  const debounceRef = useRef<number | null>(null);

  /** ===== SERP ===== */
  async function fetchSERP(q: string) {
    setSerpLoading(true);
    setSerpErr("");
    try {
      const res = await fetch(`/api/serp?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`SERP fetch failed: ${res.status}`);
      const data = await res.json();
      const list: any[] = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.organic_results)
        ? data.organic_results
        : [];
      const items = list.slice(0, 10).map((r: any, i: number) => ({
        rank: i + 1,
        title: r.title || "",
        url: r.link || "",
      }));
      setSerp(items);
    } catch (e: any) {
      setSerpErr(e?.message || String(e));
    } finally {
      setSerpLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSERP(keyword), 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [keyword]);

  /** ===== OpenAI Outline (JSON) ===== */
  async function generateOutlineWithAI() {
    setRegenBusy(true);
    setSerpErr("");
    try {
      const res = await fetch("/api/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, serpResults: serp, targetWords }),
      });
      if (!res.ok) throw new Error(`outline ${res.status}`);
      const data: OutlineJSON = await res.json();
      if (!Array.isArray(data?.h2)) throw new Error("bad_outline_shape");

      setOutline({ h2: data.h2, targetWords: data.targetWords ?? targetWords });
      setTargetWords(data.targetWords ?? targetWords);
      setRegenDone(true);
      setTimeout(() => setRegenDone(false), 900);
    } catch (e: any) {
      console.error("AI生成失敗:", e);
      setSerpErr("AIアウトライン生成に失敗しました。");
    } finally {
      setRegenBusy(false);
    }
  }

  /** ===== Editor Helpers ===== */
  // H2
  const addH2 = () =>
    setOutline((o) => ({
      ...o,
      h2: [...o.h2, { title: "新しいセクション", h3: [] }],
    }));
  const updateH2Title = (i: number, v: string) =>
    setOutline((o) => ({
      ...o,
      h2: o.h2.map((h, idx) => (idx === i ? { ...h, title: v } : h)),
    }));
  const removeH2 = (i: number) =>
    setOutline((o) => ({ ...o, h2: o.h2.filter((_, idx) => idx !== i) }));

  // H3
  const addH3 = (i2: number) =>
    setOutline((o) => {
      const h2 = [...o.h2];
      h2[i2] = { ...h2[i2], h3: [...h2[i2].h3, { title: "小見出し", h4: [] }] };
      return { ...o, h2 };
    });
  const updateH3Title = (i2: number, i3: number, v: string) =>
    setOutline((o) => {
      const h2 = [...o.h2];
      const h3 = [...h2[i2].h3];
      h3[i3] = { ...h3[i3], title: v };
      h2[i2] = { ...h2[i2], h3 };
      return { ...o, h2 };
    });
  const removeH3 = (i2: number, i3: number) =>
    setOutline((o) => {
      const h2 = [...o.h2];
      const h3 = h2[i2].h3.filter((_, idx) => idx !== i3);
      h2[i2] = { ...h2[i2], h3 };
      return { ...o, h2 };
    });

  // H4
  const addH4 = (i2: number, i3: number) =>
    setOutline((o) => {
      const h2 = [...o.h2];
      const h3 = [...h2[i2].h3];
      const h4 = [...h3[i3].h4, "詳細ポイント"];
      h3[i3] = { ...h3[i3], h4 };
      h2[i2] = { ...h2[i2], h3 };
      return { ...o, h2 };
    });
  const updateH4 = (i2: number, i3: number, i4: number, v: string) =>
    setOutline((o) => {
      const h2 = [...o.h2];
      const h3 = [...o.h2[i2].h3];
      const nh4 = [...h3[i3].h4];
      nh4[i4] = v;
      h3[i3] = { ...h3[i3], h4: nh4 };
      h2[i2] = { ...h2[i2], h3 };
      return { ...o, h2 };
    });
  const removeH4 = (i2: number, i3: number, i4: number) =>
    setOutline((o) => {
      const h2 = [...o.h2];
      const h3 = [...o.h2[i2].h3];
      const nh4 = h3[i3].h4.filter((_, idx) => idx !== i4);
      h3[i3] = { ...h3[i3], h4: nh4 };
      h2[i2] = { ...h2[i2], h3 };
      return { ...o, h2 };
    });

  /** ===== Markdown Export ===== */
  function toMarkdown(o: OutlineJSON): string {
    const lines: string[] = [];
    o.h2.forEach((H2) => {
      lines.push(`## ${H2.title}`);
      H2.h3.forEach((H3) => {
        lines.push(`### ${H3.title}`);
        H3.h4.forEach((h4) => lines.push(`#### ${h4}`));
        lines.push("");
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }
  const md = toMarkdown(outline);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(md);
      alert("Markdownをコピーしました！");
    } catch {
      alert("コピーに失敗しました");
    }
  }

  /** ===== 本文生成API ===== */
  async function generateArticle() {
    if (!outline.h2.length) {
      alert("アウトラインが空です。先にアウトラインを作成してください。");
      return;
    }
    setArticleBusy(true);
    setArticleErr("");
    setArticleMd("");

    // アウトラインに目標文字数を反映（任意）
    const outlined = { ...outline, targetWords };

    try {
      const res = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          outline: outlined,
          targetWords,
          tone: "丁寧でわかりやすい、実務者向け",
          audience: "検索ユーザー（初学者〜中級者）",
          useTables,
        }),
      });
      if (!res.ok) throw new Error(`article ${res.status}`);
      const data = await res.json();
      setArticleMd(data.markdown || "");
    } catch (e: any) {
      console.error(e);
      setArticleErr("本文の自動生成に失敗しました。もう一度お試しください。");
    } finally {
      setArticleBusy(false);
    }
  }

  function downloadArticle() {
    const blob = new Blob([articleMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${keyword || "article"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyArticle() {
    try {
      await navigator.clipboard.writeText(articleMd);
      alert("本文Markdownをコピーしました！");
    } catch {
      alert("コピーに失敗しました");
    }
  }

  /** ===== Drag & Drop ===== */
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId === "h2" && destination.droppableId === "h2") {
      const newH2 = Array.from(outline.h2);
      const [moved] = newH2.splice(source.index, 1);
      newH2.splice(destination.index, 0, moved);
      setOutline({ ...outline, h2: newH2 });
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        SEO記事自動生成ツール（AIアウトライン編集＋本文生成）
      </h1>

      {/* 1. キーワード & SERP */}
      <div className="rounded-2xl border shadow-sm p-4 bg-white space-y-3">
        <h2 className="font-semibold">1. キーワード入力 & SERP</h2>
        <div className="flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
            placeholder="例）副業 扶養"
          />
        </div>

        {serpLoading && <div className="text-sm">取得中…</div>}
        {serpErr && <div className="text-sm text-red-600">{serpErr}</div>}

        <table className="mt-2 text-sm w-full">
          <thead>
            <tr className="text-left">
              <th className="w-14">順位</th>
              <th>タイトル</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {serp.map((r) => (
              <tr key={r.rank} className="border-t">
                <td>{r.rank}</td>
                <td className="whitespace-normal break-words">{r.title}</td>
                <td className="whitespace-normal break-words text-blue-600 underline">
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.url}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. アウトライン生成 & 編集 */}
      <div className="rounded-2xl border shadow-sm p-4 bg-white space-y-4">
        <h2 className="font-semibold">2. アウトライン（AI生成 → 自由編集）</h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generateOutlineWithAI}
            disabled={regenBusy}
            className={`px-4 py-2 rounded border transition active:scale-95 ${
              regenBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-50"
            } ${regenDone ? "bg-blue-100 ring-2 ring-blue-300" : ""}`}
          >
            {regenBusy ? "生成中…" : regenDone ? "生成しました ✓" : "アウトライン自動作成（AI）"}
          </button>

          <button
            onClick={() => fetchSERP(keyword)}
            className="px-4 py-2 rounded border hover:bg-gray-50 active:scale-95 transition"
          >
            再取得
          </button>

          <button
            onClick={addH2}
            className="px-4 py-2 rounded border hover:bg-gray-50 active:scale-95 transition"
          >
            H2を追加
          </button>

          <button
            onClick={copyMarkdown}
            className="px-4 py-2 rounded border hover:bg-gray-50 active:scale-95 transition"
          >
            Markdownコピー
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="h2" type="H2">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                {outline.h2.map((H2, i2) => (
                  <Draggable key={`h2-${i2}`} draggableId={`h2-${i2}`} index={i2}>
                    {(dgH2) => (
                      <div
                        ref={dgH2.innerRef}
                        {...dgH2.draggableProps}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex gap-2 items-center">
                          <span
                            {...dgH2.dragHandleProps}
                            className="cursor-grab select-none px-2"
                            title="ドラッグして並び替え"
                          >
                            ≡
                          </span>
                          <input
                            value={H2.title}
                            onChange={(e) => updateH2Title(i2, e.target.value)}
                            className="border rounded px-2 py-1 flex-1"
                          />
                          <button
                            onClick={() => addH3(i2)}
                            className="px-2 py-1 text-sm rounded border hover:bg-gray-50 active:scale-95 transition"
                          >
                            H3を追加
                          </button>
                          <button
                            onClick={() => removeH2(i2)}
                            className="px-2 py-1 text-sm rounded border hover:bg-red-50 text-red-600 active:scale-95 transition"
                          >
                            H2削除
                          </button>
                        </div>

                        <div className="pl-6 mt-3 space-y-3">
                          {H2.h3.map((H3, i3) => (
                            <div key={i3} className="border rounded p-2">
                              <div className="flex gap-2 items-center">
                                <span className="text-sm text-gray-500">H3</span>
                                <input
                                  value={H3.title}
                                  onChange={(e) => updateH3Title(i2, i3, e.target.value)}
                                  className="border rounded px-2 py-1 flex-1"
                                />
                                <button
                                  onClick={() => addH4(i2, i3)}
                                  className="px-2 py-1 text-sm rounded border hover:bg-gray-50 active:scale-95 transition"
                                >
                                  H4を追加
                                </button>
                                <button
                                  onClick={() => removeH3(i2, i3)}
                                  className="px-2 py-1 text-sm rounded border hover:bg-red-50 text-red-600 active:scale-95 transition"
                                >
                                  H3削除
                                </button>
                              </div>

                              <div className="pl-6 mt-2 space-y-2">
                                {H3.h4.map((h4, i4) => (
                                  <div key={i4} className="flex gap-2 items-center">
                                    <span className="text-sm text-gray-500">H4</span>
                                    <input
                                      value={h4}
                                      onChange={(e) => updateH4(i2, i3, i4, e.target.value)}
                                      className="border rounded px-2 py-1 flex-1"
                                    />
                                    <button
                                      onClick={() => removeH4(i2, i3, i4)}
                                      className="px-2 py-1 text-sm rounded border hover:bg-red-50 text-red-600 active:scale-95 transition"
                                    >
                                      H4削除
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="mt-2">
          <h3 className="text-sm font-semibold mb-1">Markdownプレビュー</h3>
          <pre className="whitespace-pre-wrap border rounded p-3 bg-gray-50 text-sm">
{toMarkdown(outline)}
          </pre>
        </div>
      </div>

      {/* 3. 本文生成 */}
      <div className="rounded-2xl border shadow-sm p-4 bg-white space-y-3">
        <h2 className="font-semibold">3. 本文生成（アウトライン確定後）</h2>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm flex items-center gap-2">
            目標文字数
            <input
              type="number"
              min={800}
              step={200}
              value={targetWords}
              onChange={(e) => setTargetWords(Math.max(200, Number(e.target.value) || 0))}
              className="border rounded px-2 py-1 w-28"
            />
          </label>

          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={useTables}
              onChange={(e) => setUseTables(e.target.checked)}
            />
            表を積極的に使う
          </label>

          <button
            onClick={generateArticle}
            disabled={articleBusy}
            className={`px-4 py-2 rounded border transition active:scale-95 ${
              articleBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-50"
            }`}
          >
            {articleBusy ? "生成中…" : "本文を自動生成"}
          </button>

          {articleMd && (
            <>
              <button
                onClick={copyArticle}
                className="px-4 py-2 rounded border hover:bg-gray-50 active:scale-95 transition"
              >
                本文をコピー
              </button>
              <button
                onClick={downloadArticle}
                className="px-4 py-2 rounded border hover:bg-gray-50 active:scale-95 transition"
              >
                Markdownをダウンロード
              </button>
            </>
          )}
        </div>

        {articleErr && <div className="text-sm text-red-600">{articleErr}</div>}

        {articleMd && (
          <div className="mt-2">
            <h3 className="text-sm font-semibold mb-1">本文プレビュー（Markdown）</h3>
            <pre className="whitespace-pre-wrap border rounded p-3 bg-gray-50 text-sm">
{articleMd}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
