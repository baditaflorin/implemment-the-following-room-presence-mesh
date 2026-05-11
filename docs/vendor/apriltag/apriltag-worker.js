/* room-presence-mesh AprilTag worker.
 *
 * Loads the Emscripten module from `apriltag_wasm.js` and exposes a tiny
 * message-based API (init / detect). The upstream `apriltag.js` ships a
 * Comlink wrapper that pulls Comlink from a third-party CDN; we don't want
 * a runtime network dependency, so we wire the cwrap calls directly here.
 *
 * Upstream: https://github.com/arenaxr/apriltag-js-standalone (BSD-2)
 */
importScripts("./apriltag_wasm.js");

let mod = null;
let detectFn = null;
let setImgBuffer = null;

self.addEventListener("message", async (ev) => {
  const data = ev.data || {};
  const { type, id } = data;
  try {
    if (type === "init") {
      mod = await AprilTagWasm();
      const init = mod.cwrap("atagjs_init", "number", []);
      const setOpts = mod.cwrap("atagjs_set_detector_options", "number", [
        "number",
        "number",
        "number",
        "number",
        "number",
        "number",
        "number",
      ]);
      setImgBuffer = mod.cwrap("atagjs_set_img_buffer", "number", ["number", "number", "number"]);
      detectFn = mod.cwrap("atagjs_detect", "number", []);
      init();
      // decimate=2, sigma=0, nthreads=1, refine_edges=1, max_detections=0,
      // return_pose=0, return_solutions=0 — we just want tag IDs.
      setOpts(2.0, 0.0, 1, 1, 0, 0, 0);
      self.postMessage({ type: "ready", id });
      return;
    }
    if (type === "detect") {
      if (!mod) {
        self.postMessage({ type: "error", id, error: "not initialized" });
        return;
      }
      const { buffer, width, height } = data.payload;
      const grayscale = new Uint8Array(buffer);
      if (width * height < grayscale.length) {
        self.postMessage({ type: "error", id, error: "image too large" });
        return;
      }
      const imgBuf = setImgBuffer(width, height, width);
      mod.HEAPU8.set(grayscale, imgBuf);
      const strJsonPtr = detectFn();
      const strJsonLen = mod.getValue(strJsonPtr, "i32");
      if (strJsonLen === 0) {
        self.postMessage({ type: "result", id, detections: [] });
        return;
      }
      const strJsonStrPtr = mod.getValue(strJsonPtr + 4, "i32");
      const view = new Uint8Array(mod.HEAP8.buffer, strJsonStrPtr, strJsonLen);
      let json = "";
      for (let i = 0; i < strJsonLen; i++) json += String.fromCharCode(view[i]);
      const detections = JSON.parse(json);
      self.postMessage({ type: "result", id, detections });
      return;
    }
    self.postMessage({ type: "error", id, error: `unknown message type: ${type}` });
  } catch (err) {
    self.postMessage({
      type: "error",
      id,
      error: err && err.message ? err.message : String(err),
    });
  }
});
