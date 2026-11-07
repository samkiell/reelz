import fs from "fs/promises";
import path from "path";
import { ScriptDocument, TranscriptWord } from "@/lib/schemas";

export interface CompileOptions {
  projectDir: string;
  script: ScriptDocument;
  transcript: TranscriptWord[];
  audioDuration: number;
}

export async function compileHyperframesComposition({
  projectDir,
  script,
  transcript,
  audioDuration,
}: CompileOptions): Promise<string> {
  const resolvedDir = path.resolve(projectDir);

  // Copy template hyperframes.json and meta.json if not present
  const templateDir = path.resolve(process.cwd(), "templates", "shorts", "classic");
  const hyperframesJsonPath = path.join(resolvedDir, "hyperframes.json");
  const metaJsonPath = path.join(resolvedDir, "meta.json");

  await fs.copyFile(path.join(templateDir, "hyperframes.json"), hyperframesJsonPath);
  await fs.copyFile(path.join(templateDir, "meta.json"), metaJsonPath);

  // Ensure assets/vendor and assets/sfx are copied into project
  const projectAssetsDir = path.join(resolvedDir, "assets");
  await fs.mkdir(projectAssetsDir, { recursive: true });

  const projectVendorDir = path.join(projectAssetsDir, "vendor");
  await fs.mkdir(projectVendorDir, { recursive: true });
  await fs.copyFile(
    path.join(templateDir, "assets", "vendor", "gsap.min.js"),
    path.join(projectVendorDir, "gsap.min.js")
  );

  const numScenes = script.scenes.length;
  // Compute approximate phase start and end times
  const totalDuration = Math.max(audioDuration + 1.5, 5); // +1.5s thumbnail hold
  const sceneDuration = audioDuration / numScenes;

  const sceneTimings = script.scenes.map((_, idx) => {
    const start = idx * sceneDuration;
    const end = (idx + 1) * sceneDuration;
    return { start, end };
  });

  const html = generateCompositionHtml({
    script,
    transcript,
    audioDuration,
    totalDuration,
    sceneTimings,
  });

  const indexPath = path.join(resolvedDir, "index.html");
  await fs.writeFile(indexPath, html, "utf-8");

  return indexPath;
}

interface HtmlProps {
  script: ScriptDocument;
  transcript: TranscriptWord[];
  audioDuration: number;
  totalDuration: number;
  sceneTimings: { start: number; end: number }[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateCompositionHtml({
  script,
  audioDuration,
  totalDuration,
  sceneTimings,
}: HtmlProps): string {
  const scenesHtml = script.scenes
    .map((scene, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === script.scenes.length - 1;
      const sceneNum = String(idx + 1).padStart(2, "0");
      const totalNum = String(script.scenes.length).padStart(2, "0");

      return `
    <div id="scene-${idx}" class="scene ${isFirst ? "active" : ""}">
      <div class="scene-badge">SCENE ${sceneNum} / ${totalNum}</div>
      <div class="card-hero">
        <h2 class="hero-text">${escapeHtml(scene.onScreenText)}</h2>
      </div>
      <div class="narration-pill">
        <p class="narration-text">${escapeHtml(scene.narration)}</p>
      </div>
      ${
        isLast
          ? `<div class="hold-badge">
               <span class="pulse-dot"></span> REELZ EXCLUSIVE
             </div>`
          : ""
      }
    </div>`;
    })
    .join("\n");

  // Build GSAP Timeline script
  const timelineTransitions = sceneTimings
    .map((timing, idx) => {
      if (idx === sceneTimings.length - 1) return "";
      const t = timing.end.toFixed(2);
      return `
    // Transition scene-${idx} -> scene-${idx + 1}
    tl.to("#scene-${idx}", { opacity: 0, y: -20, duration: 0.35, ease: "power2.in" }, ${t});
    tl.set("#scene-${idx}", { visibility: "hidden" }, ${t} + 0.35);
    tl.set("#scene-${idx + 1}", { visibility: "visible", opacity: 0, y: 30 }, ${t} + 0.35);
    tl.to("#scene-${idx + 1}", { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, ${t} + 0.36);
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(script.title)}</title>
<script src="assets/vendor/gsap.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    background: #080B11;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #F1F5F9;
    -webkit-font-smoothing: antialiased;
  }

  #canvas {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: radial-gradient(circle at 50% 30%, #111827 0%, #080B11 80%);
    overflow: hidden;
  }

  /* Progress bar */
  #progress-track {
    position: absolute;
    top: 0;
    left: 0;
    width: 1080px;
    height: 10px;
    background: rgba(255, 255, 255, 0.08);
    z-index: 50;
  }
  #progress-bar {
    width: 0px;
    height: 100%;
    background: #3B82F6;
  }

  /* Top brand header */
  #header {
    position: absolute;
    top: 90px;
    left: 80px;
    right: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 40;
  }
  .brand-tag {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #38BDF8;
    text-transform: uppercase;
  }
  .topic-tag {
    font-size: 22px;
    font-weight: 600;
    color: #94A3B8;
    background: rgba(255, 255, 255, 0.05);
    padding: 8px 18px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 500px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Scenes container */
  #stage {
    position: absolute;
    top: 0;
    left: 0;
    width: 1080px;
    height: 1920px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 100px;
  }

  .scene {
    position: absolute;
    width: 920px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    visibility: hidden;
    opacity: 0;
  }

  .scene.active {
    visibility: visible;
    opacity: 1;
  }

  .scene-badge {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 3px;
    color: #38BDF8;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 10px 24px;
    border-radius: 9999px;
    margin-bottom: 40px;
  }

  .card-hero {
    background: rgba(18, 24, 38, 0.9);
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-radius: 36px;
    padding: 70px 50px;
    margin-bottom: 50px;
    width: 100%;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  }

  .hero-text {
    font-size: 64px;
    font-weight: 900;
    line-height: 1.25;
    color: #FFFFFF;
    text-transform: uppercase;
    letter-spacing: -0.5px;
  }

  .narration-pill {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px;
    padding: 32px 40px;
    width: 100%;
  }

  .narration-text {
    font-size: 36px;
    font-weight: 500;
    line-height: 1.45;
    color: #CBD5E1;
  }

  .hold-badge {
    margin-top: 50px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #10B981;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: 12px 28px;
    border-radius: 9999px;
  }

  .pulse-dot {
    width: 12px;
    height: 12px;
    background: #10B981;
    border-radius: 50%;
  }
</style>
</head>
<body>
<div id="canvas">
  <div id="progress-track"><div id="progress-bar"></div></div>

  <div id="header">
    <div class="brand-tag">REELZ</div>
    <div class="topic-tag">${escapeHtml(script.title)}</div>
  </div>

  <div id="stage">
    ${scenesHtml}
  </div>

  <audio id="narration" class="clip" src="audio/narration.wav" data-start="0" data-duration="${audioDuration.toFixed(2)}" data-track-index="2" data-volume="1"></audio>
</div>

<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  // Smooth progress bar fill
  tl.fromTo("#progress-bar",
    { width: 0 },
    { width: 1080, duration: ${audioDuration.toFixed(2)}, ease: "none" },
    0
  );

  // Scene 0 entrance
  tl.from("#scene-0", { opacity: 0, y: 30, duration: 0.5, ease: "power2.out" }, 0.1);

  ${timelineTransitions}

  // End timeline
  window.__timelines["main"] = tl;
</script>
</body>
</html>`;
}

