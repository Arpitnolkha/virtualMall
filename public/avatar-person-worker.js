// Classic worker: MediaPipe's WASM loader uses importScripts.
// All runtime and model assets are served locally; avatar pixels never leave the device.
let segmenter;
let alphaFor;
let output;
let context;
let maskCanvas;
let maskContext;
let maskPixels;
let faceDetector;
let framingFor;
let framing;
let normalized;
let normalizedContext;
let inputSize;
let bottomFor;
let torsoFadeFor;
let isVideo = false;
let frostedBackground = false;
let frostedCanvas;
let frostedContext;

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    isVideo = data.isVideo === true;
    frostedBackground = data.frostedBackground === true;
    try {
      const [
        { FilesetResolver, ImageSegmenter, FaceDetector },
        { personAlpha },
        { avatarFraming, foregroundBottom, avatarTorsoFade },
      ] = await Promise.all([
        import("/vendor/mediapipe/vision_bundle.mjs"),
        import("/avatar-mask.mjs"),
        import("/avatar-framing.mjs"),
      ]);
      alphaFor = personAlpha;
      framingFor = avatarFraming;
      bottomFor = foregroundBottom;
      torsoFadeFor = avatarTorsoFade;
      const vision = await FilesetResolver.forVisionTasks(
        "/vendor/mediapipe/wasm",
      );
      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/selfie_segmenter.tflite",
          delegate: "CPU",
        },
        canvas: new OffscreenCanvas(256, 256),
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      // Calibration runs once per source size, rather than tracking each expression.
      try {
        faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/blaze_face_short_range.tflite",
            delegate: "CPU",
          },
          canvas: new OffscreenCanvas(128, 128),
          runningMode: "IMAGE",
          minDetectionConfidence: 0.5,
        });
      } catch {
        /* Segmentation can still render if face calibration is unavailable. */
      }
      normalized = new OffscreenCanvas(512, 512);
      normalizedContext = normalized.getContext("2d");
      frostedCanvas = new OffscreenCanvas(512, 512);
      frostedContext = frostedCanvas.getContext("2d");
      self.postMessage({ type: "ready" });
    } catch {
      self.postMessage({ type: "error" });
    }
    return;
  }
  const frame = data.frame;
  if (!frame) return;
  try {
    if (!segmenter) throw new Error("Segmenter unavailable");
    if (
      !output ||
      output.width !== frame.width ||
      output.height !== frame.height
    ) {
      output = new OffscreenCanvas(frame.width, frame.height);
      context = output.getContext("2d");
    }
    const dimensions = `${frame.width}x${frame.height}`;
    const calibrate = inputSize !== dimensions;
    if (calibrate) {
      let face;
      try {
        face = faceDetector?.detect(frame).detections[0]?.boundingBox;
      } catch {
        /* Keep an aspect-preserving fallback. */
      }
      if (isVideo && faceDetector && !face) {
        self.postMessage({ type: "skip" });
        return;
      }
      framing = framingFor(face, frame.width, frame.height);
      inputSize = dimensions;
    }
    let personBottom = null;
    segmenter.segment(frame, (result) => {
      // The binary SelfieSegmenter exposes a single foreground confidence mask.
      // Some model revisions expose both categories (background, person).
      const masks = result.confidenceMasks;
      const mask = masks?.[masks.length === 1 ? 0 : 1];
      if (!mask) throw new Error("Missing person mask");
      if (
        !maskCanvas ||
        maskCanvas.width !== mask.width ||
        maskCanvas.height !== mask.height
      ) {
        maskCanvas = new OffscreenCanvas(mask.width, mask.height);
        maskContext = maskCanvas.getContext("2d");
        maskPixels = maskContext.createImageData(mask.width, mask.height);
      }
      const confidence = mask.getAsFloat32Array();
      personBottom = bottomFor(confidence, mask.width, mask.height);
      for (let i = 0; i < confidence.length; i++)
        maskPixels.data[i * 4 + 3] = alphaFor(confidence[i]);
      maskContext.putImageData(maskPixels, 0, 0);
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, output.width, output.height);
      context.drawImage(frame, 0, 0);
      context.globalCompositeOperation = "destination-in";
      context.drawImage(maskCanvas, 0, 0, output.width, output.height);
    });
    if (personBottom === null) {
      self.postMessage({ type: "skip" });
      return;
    }
    const torsoFade = isVideo
      ? torsoFadeFor(framing, personBottom, output.height)
      : null;
    if (isVideo && !frostedBackground && !torsoFade) {
      self.postMessage({ type: "skip" });
      return;
    }
    normalizedContext.globalCompositeOperation = "source-over";
    normalizedContext.clearRect(0, 0, 512, 512);
    normalizedContext.drawImage(
      output,
      framing.x,
      framing.y,
      output.width * framing.scale,
      output.height * framing.scale,
    );
    if (isVideo && !frostedBackground) {
      // Soften the live crop edge against the showroom, with no static torso
      // underneath. Keep the calibrated face size and position unchanged.
      const fade = normalizedContext.createLinearGradient(
        0, torsoFade.start, 0, torsoFade.bottom,
      );
      fade.addColorStop(0, "rgba(0,0,0,1)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      normalizedContext.globalCompositeOperation = "destination-in";
      normalizedContext.fillStyle = fade;
      normalizedContext.fillRect(0, 0, 512, 512);
    }
    // Both layers use the SAME frame and transform: no delayed or doubled body.
    if (frostedBackground) {
      frostedContext.clearRect(0, 0, 512, 512);
      frostedContext.fillStyle = "#b7a58b";
      frostedContext.fillRect(0, 0, 512, 512);
      frostedContext.filter = "blur(18px)";
      frostedContext.drawImage(frame, framing.x, framing.y, frame.width * framing.scale, frame.height * framing.scale);
      frostedContext.filter = "none";
      frostedContext.fillStyle = "rgba(248,239,222,0.24)";
      frostedContext.fillRect(0, 0, 512, 512);
      frostedContext.drawImage(normalized, 0, 0);
    }
    const cutout = (frostedBackground ? frostedCanvas : normalized).transferToImageBitmap();
    self.postMessage({ type: "frame", frame: cutout }, [cutout]);
  } catch {
    self.postMessage({ type: "error" });
  } finally {
    frame.close();
  }
};
