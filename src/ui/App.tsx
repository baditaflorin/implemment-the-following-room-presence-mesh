import { useEffect, useState } from "preact/hooks";
import { HomeView } from "@/ui/views/HomeView";
import { ScannerView } from "@/ui/views/ScannerView";
import { SuggestionsView } from "@/ui/views/SuggestionsView";
import { MeshView } from "@/ui/views/MeshView";
import { RoomsView } from "@/ui/views/RoomsView";
import { SettingsView } from "@/ui/views/SettingsView";
import { BottomNav, type Route } from "@/ui/BottomNav";
import { Onboarding } from "@/ui/Onboarding";
import { markOnboarded, shouldShowOnboarding } from "@/ui/onboardingStorage";
import { db } from "@/lib/storage/db";

export function App() {
  const [route, setRoute] = useState<Route>("home");
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(() =>
    shouldShowOnboarding(typeof window === "undefined" ? null : window.localStorage),
  );

  useEffect(() => {
    db.open()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("db open failed", err);
        setReady(true);
      });
  }, []);

  const dismissIntro = () => {
    markOnboarded(window.localStorage);
    setShowIntro(false);
  };

  return (
    <div class="min-h-full flex flex-col">
      <header class="px-4 pt-5 pb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-accent-500/20 ring-1 ring-accent-500/40 flex items-center justify-center">
            <div class="w-2.5 h-2.5 rounded-full bg-accent-500" />
          </div>
          <div class="font-semibold tracking-tight">room-presence-mesh</div>
        </div>
        <span class="pill">local-only</span>
      </header>

      <main class="flex-1 px-4 pb-24 max-w-xl mx-auto w-full">
        {!ready ? (
          <div class="text-ink-400 text-sm py-8">opening local store…</div>
        ) : route === "home" ? (
          <HomeView onNavigate={setRoute} />
        ) : route === "scan" ? (
          <ScannerView onDone={() => setRoute("home")} />
        ) : route === "rooms" ? (
          <RoomsView />
        ) : route === "suggest" ? (
          <SuggestionsView />
        ) : route === "mesh" ? (
          <MeshView />
        ) : (
          <SettingsView />
        )}
      </main>

      <BottomNav route={route} onChange={setRoute} />
      {showIntro ? <Onboarding onDismiss={dismissIntro} /> : null}
    </div>
  );
}
