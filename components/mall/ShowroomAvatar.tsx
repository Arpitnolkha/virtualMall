"use client";
import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";
import { useMallAvatar } from "@/lib/mall/productContext";
function OriginalVideo({ source }: { source: HTMLVideoElement }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [readySource, setReadySource] = useState<HTMLVideoElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const attach = () => {
      if (element.srcObject !== source.srcObject) element.srcObject = source.srcObject;
      void element.play().catch(() => { /* Keep the portrait until playback starts. */ });
    };
    attach();
    source.addEventListener("loadeddata", attach);
    source.addEventListener("playing", attach);
    return () => {
      source.removeEventListener("loadeddata", attach);
      source.removeEventListener("playing", attach);
      element.pause();
      element.srcObject = null; // The shared remote track belongs to the session.
    };
  }, [source]);
  return <video ref={ref} className="maya-original-video" aria-label="Maya live avatar"
    autoPlay muted playsInline style={{ opacity: readySource === source ? 1 : 0 }}
    onPlaying={() => setReadySource(source)} />;
}

// Every showroom surface uses the same unprocessed frame. Switching from the
// portrait to a live stream must never switch to background segmentation.
export default memo(function ShowroomAvatar() {
  const { video } = useMallAvatar();
  return (
    <div className="showroom-avatar" aria-label="Maya, your shopkeeper">
      <div className="maya-avatar-waiting">
        <Image className="maya-placeholder-image" src="/avatars/maya-natural.png"
          alt="Maya, your shopkeeper" width={1024} height={768} priority />
      </div>
      {video && <OriginalVideo source={video} />}
    </div>
  );
});
