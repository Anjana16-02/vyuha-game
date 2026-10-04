import { motion } from "framer-motion";
import { audio } from "../game/audio/AudioManager";
import { useGame } from "../state/gameStore";
import type { ReactNode } from "react";

export function Glyph({ children, onClick, dim }: { children: ReactNode; onClick?: () => void; dim?: boolean }) {
  return (
    <motion.button
      type="button"
      className={`glyph ${dim ? "dim" : ""}`}
      whileHover={{ y: -2, filter: "brightness(1.12)" }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => audio.hover()}
      onClick={() => {
        audio.select();
        onClick?.();
      }}
    >
      {children}
    </motion.button>
  );
}

export function Bronze({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <motion.button
      type="button"
      className={`bronze ${className}`}
      whileHover={{ letterSpacing: "0.18em" }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => audio.hover()}
      onClick={() => {
        audio.confirm();
        onClick?.();
      }}
    >
      {children}
    </motion.button>
  );
}

export function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`frame ${className}`}>{children}</div>;
}

export function NavBar() {
  const items: Array<[string, string]> = [
    ["war_room", "War Room"],
    ["ready", "Battle"],
    ["armory", "Armory"],
    ["commanders", "Commanders"],
    ["warriors", "Warriors"],
    ["kingdom", "Kingdom"],
    ["achievements", "Achievements"],
    ["history", "History"],
    ["collection", "Collection"],
    ["challenges", "Challenges"],
    ["settings", "Settings"],
  ];
  const screen = useGame((s) => s.screen);
  const go = useGame((s) => s.go);
  return (
    <nav className="game-nav">
      {items.map(([id, label]) => (
        <button key={id} className={screen === id ? "on" : ""} onMouseEnter={() => audio.hover()} onClick={() => go(id as never)}>
          <span className="nav-mark" />
          {label}
        </button>
      ))}
    </nav>
  );
}
