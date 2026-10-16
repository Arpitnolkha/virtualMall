import { useMallAvatar } from "@/lib/mall/productContext";
import ErrorBoundary from "@/components/mall/ErrorBoundary";
import { PersonAvatar } from "./ShopkeeperAvatar";
import { useCallback, useState } from "react";

export default function AnamAvatarView({ frostedBackground = false }: { frostedBackground?: boolean }) {
  const { video } = useMallAvatar();
  const [readyVideo, setReadyVideo] = useState<HTMLVideoElement | null>(null);
  const onReady = useCallback(() => setReadyVideo(video ?? null), [video]);
  const liveReady = !!video && readyVideo === video;
  return (
    <ErrorBoundary fallback={null}>
      {video && (
        <group visible={liveReady}>
          <PersonAvatar key={video.id} video={video} onReady={onReady} frostedBackground={frostedBackground} />
        </group>
      )}
    </ErrorBoundary>
  );
}
