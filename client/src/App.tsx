import { useEffect } from "react";
import { useGame } from "./state/gameStore";
import { audio } from "./game/audio/AudioManager";
import { IntroScreen, IdentityScreen } from "./screens/Intro";
import {
  ArmyScreen,
  ArmoryScreen,
  ChallengesScreen,
  CollectionScreen,
  CommandersScreen,
  KingdomScreen,
  ReadyScreen,
  StrategyScreen,
  VyuhaScreen,
  WarRoomScreen,
  WarriorsScreen,
} from "./screens/World";
import {
  AchievementsScreen,
  AnalysisScreen,
  BattleScreen,
  GeneratingScreen,
  HistoryScreen,
  ReplayScreen,
  ResultsScreen,
  SettingsScreen,
  TutorialScreen,
  WebglFallback,
} from "./screens/Battle";

export function App() {
  const screen = useGame((s) => s.screen);
  const boot = useGame((s) => s.boot);
  const webgl = useGame((s) => s.webgl);
  const notice = useGame((s) => s.fallbackNotice);
  useEffect(() => {
    void boot();
    const canvas = document.createElement("canvas");
    const ok = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    if (!ok) useGame.setState({ webgl: false });
    const onFirst = () => {
      void audio.unlock();
      window.removeEventListener("pointerdown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst);
    return () => window.removeEventListener("pointerdown", onFirst);
  }, [boot]);

  if (!webgl) return <WebglFallback />;

  return (
    <div className="app-root">
      {notice && <div className="toast">{notice}</div>}
      {screen === "intro" && <IntroScreen />}
      {screen === "identity" && <IdentityScreen />}
      {screen === "war_room" && <WarRoomScreen />}
      {screen === "commanders" && <CommandersScreen />}
      {screen === "warriors" && <WarriorsScreen />}
      {screen === "armory" && <ArmoryScreen />}
      {screen === "kingdom" && <KingdomScreen />}
      {screen === "army" && <ArmyScreen />}
      {screen === "vyuha" && <VyuhaScreen />}
      {screen === "strategy" && <StrategyScreen />}
      {screen === "ready" && <ReadyScreen />}
      {screen === "generating" && <GeneratingScreen />}
      {screen === "battle" && <BattleScreen />}
      {screen === "results" && <ResultsScreen />}
      {screen === "analysis" && <AnalysisScreen />}
      {screen === "history" && <HistoryScreen />}
      {screen === "replay" && <ReplayScreen />}
      {screen === "achievements" && <AchievementsScreen />}
      {screen === "collection" && <CollectionScreen />}
      {screen === "settings" && <SettingsScreen />}
      {screen === "tutorial" && <TutorialScreen />}
      {screen === "challenges" && <ChallengesScreen />}
    </div>
  );
}
