import { render } from "preact";
import { App } from "@/ui/App";
import "@/styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app root");
render(<App />, root);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    const swUrl = new URL("sw.js", document.baseURI).toString();
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn("sw registration failed", err);
    });
  });
}
