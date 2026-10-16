// Match the visible face, not the video's aspect ratio or crop. Coordinates are pixels.
export function avatarFraming(face, width, height, size = 512) {
  if (
    face &&
    Number.isFinite(face.height) &&
    face.height > 0 &&
    Number.isFinite(face.width) &&
    face.width > 0 &&
    Number.isFinite(face.originX) &&
    Number.isFinite(face.originY)
  ) {
    const scale = (size * 0.27) / face.height;
    return {
      scale,
      x: size * 0.5 - (face.originX + face.width / 2) * scale,
      y: size * 0.39 - (face.originY + face.height / 2) * scale,
    };
  }
  const scale = size / Math.max(width, height, 1);
  return {
    scale,
    x: (size - width * scale) / 2,
    y: (size - height * scale) / 2,
  };
}

export function foregroundBottom(confidence, width, height) {
  const minimumPixels = Math.max(2, Math.ceil(width * 0.04));
  for (let y = height - 1; y >= 0; y--) {
    let count = 0;
    for (let x = 0; x < width; x++) {
      if (confidence[y * width + x] >= 0.75) count++;
    }
    if (count >= minimumPixels) return (y + 1) / height;
  }
  return null;
}

// A partial mask must never fade the face. Hold the last good frame instead.
export function avatarTorsoFade(framing, personBottom, sourceHeight, size = 512) {
  if (personBottom === null) return null;
  const bottom = framing.y + personBottom * sourceHeight * framing.scale;
  const start = bottom - size * (18 / 512);
  // The calibrated face ends at 52.5%; reserve extra room for jaw movement.
  if (!Number.isFinite(start) || start < size * 0.6) return null;
  return { start, bottom };
}
