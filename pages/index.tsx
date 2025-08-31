// pages/index.tsx
import dynamic from "next/dynamic";

// window を使うので SSR は無効化
const SeoTool = dynamic(() => import("../components/SeoTool"), { ssr: false });

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb" }}>
      <SeoTool />
    </div>
  );
}
