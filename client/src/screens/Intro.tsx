import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { audio } from "../game/audio/AudioManager";
import { useGame } from "../state/gameStore";
import { Bronze } from "../components/ui";

export function IntroScreen() {
  const go = useGame((s) => s.go);
  const profile = useGame((s) => s.profile);
  const [phase, setPhase] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    audio.setScene("intro");
    const t = [400, 1400, 2600, 3800].map((ms, i) => setTimeout(() => setPhase(i + 1), ms));
    return () => t.forEach(clearTimeout);
  }, []);
  if (showTutorial) return <InteractiveTutorial onComplete={() => setShowTutorial(false)} />;
  return (
    <div className="intro-root" onClick={() => void audio.unlock()}>
      <div className="intro-particles" />
      <div className="intro-sil" />
      <motion.div className="intro-banner" animate={{ x: [0, 8, 0], rotate: [-1, 1, -1] }} transition={{ duration: 8, repeat: Infinity }} />
      <div className="intro-copy">
        <AnimatePresence>
          {phase >= 1 && (
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="title-xl">
              VYUHA
            </motion.h1>
          )}
        </AnimatePresence>
        {phase >= 2 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="subtitle">
            EVOLUTION OF BATTLE
          </motion.p>
        )}
        {phase >= 3 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tagline">
            Every formation has a weakness.
          </motion.p>
        )}
        {phase >= 4 && (
          <div className="intro-actions">
            <Bronze
              onClick={() => {
                void audio.unlock();
                audio.drums();
                setShowTutorial(true);
              }}
            >
              HOW TO PLAY
            </Bronze>
            <Bronze
              onClick={() => {
                void audio.unlock();
                audio.drums();
                go(profile.username ? "war_room" : "identity");
              }}
            >
              ENTER THE WAR ROOM
            </Bronze>
          </div>
        )}
      </div>
    </div>
  );
}

function InteractiveTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome, Commander",
      content: "You are about to command an ancient Indian army in strategic battle.",
    },
    {
      title: "Your Role",
      content: "You make strategic decisions BEFORE battle. Once battle begins, your army executes your strategy automatically.",
    },
    {
      title: "Commander",
      content: "Your commander affects army abilities, morale, and special tactics. Choose wisely.",
    },
    {
      title: "Warriors",
      content: "Elite warriors provide special strengths to your army.",
    },
    {
      title: "Army Composition",
      content: "Balance your army: Infantry, Archers, Cavalry, Elephants, Chariots, and Elite Warriors.",
    },
    {
      title: "Vyuha - Formation",
      content: "Vyuha is your battlefield formation. Each has unique strengths and weaknesses.",
    },
    {
      title: "Attack Pattern",
      content: "Choose how your army engages: Frontal Assault, Flanking, Breakthrough, Encirclement, Counterattack, or Targeted Strike.",
    },
    {
      title: "Battle",
      content: "Watch your strategy unfold. Units move, fight, and adapt based on your decisions.",
    },
    {
      title: "Victory",
      content: "Win by destroying the enemy army, breaking their morale, or causing their formation to collapse.",
    },
    {
      title: "Ready?",
      content: "The battlefield awaits.",
    },
  ];
  const current = steps[step];
  return (
    <div className="intro-root tutorial-overlay">
      <div className="tutorial-card">
        <p className="kicker">Step {step + 1} of {steps.length}</p>
        <h2>{current.title}</h2>
        <p>{current.content}</p>
        <div className="tutorial-progress">
          {steps.map((_, i) => (
            <div key={i} className={`dot ${i === step ? "active" : ""} ${i < step ? "complete" : ""}`} />
          ))}
        </div>
        <div className="tutorial-actions">
          {step > 0 && <button className="text-btn" onClick={() => setStep(step - 1)}>Back</button>}
          {step < steps.length - 1 ? (
            <Bronze onClick={() => setStep(step + 1)}>Next</Bronze>
          ) : (
            <Bronze onClick={onComplete}>Begin</Bronze>
          )}
        </div>
      </div>
    </div>
  );
}

export function IdentityScreen() {
  const setIdentity = useGame((s) => s.setIdentity);
  const [name, setName] = useState("Aryan");
  const [kingdom, setKingdom] = useState("Ashva Hold");
  return (
    <div className="intro-root identity">
      <div className="intro-sil" />
      <div className="intro-copy">
        <p className="kicker">Name the host</p>
        <h2>The field will remember you.</h2>
        <label>
          Commander
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        </label>
        <label>
          Kingdom
          <input value={kingdom} onChange={(e) => setKingdom(e.target.value)} maxLength={28} />
        </label>
        <Bronze onClick={() => setIdentity(name.trim() || "Commander", kingdom.trim() || "Hold")}>TAKE THE BANNER</Bronze>
      </div>
    </div>
  );
}
