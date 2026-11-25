import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BUBI_EMOTIONS, type Animation, type Emotion } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import "@/index.css";

const motions: Animation[] = ["wave", "nod", "think", "lean_in", "celebrate"];

function Preview() {
  const [emotion, setEmotion] = useState<Emotion>("idle");
  const [motion, setMotion] = useState<Animation>("wave");
  const [beat, setBeat] = useState(0);
  const [reduced, setReduced] = useState(false);

  return <main style={{ maxWidth: 1000, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
    <h1>Bubi motion preview</h1>
    <p>Checking the six Figma expressions and the five supported, one-shot motions.</p>
    <section style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBlock: 24 }}>
      {BUBI_EMOTIONS.map((pose) => <article key={pose} style={{ display: "grid", justifyItems: "center", gap: 8, minWidth: 110 }}>
        <BubiMascot animation="wave" animationKey={pose} emotion={pose} />
        <span>{pose}</span>
      </article>)}
    </section>
    <section style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <label>Expression <select value={emotion} onChange={(event) => setEmotion(event.target.value as Emotion)}>{BUBI_EMOTIONS.map((pose) => <option key={pose}>{pose}</option>)}</select></label>
      <label>Motion <select value={motion} onChange={(event) => setMotion(event.target.value as Animation)}>{motions.map((clip) => <option key={clip}>{clip}</option>)}</select></label>
      <button onClick={() => setBeat((current) => current + 1)}>Replay beat</button>
      <label><input checked={reduced} onChange={(event) => setReduced(event.target.checked)} type="checkbox" /> Kurangi gerakan</label>
      <BubiMascot animation={motion} animationKey={beat} emotion={emotion} />
    </section>
    <style>{reduced ? ".bubi-mascot-motion__pose .bubi-part { animation: none !important; transform: none !important; }" : ""}</style>
  </main>;
}

createRoot(document.getElementById("root")!).render(<Preview />);
