"use client";

import { useEffect, useRef } from "react";

export function GamePlaceholder({
  onGameOver,
  onPlayRequest,
  startNonce
}: {
  onGameOver: (score: number) => void;
  onPlayRequest: () => void;
  startNonce: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "ARC_JUMP_GAME_OVER") {
        onGameOver(Number(event.data.score) || 0);
      }

      if (event.data?.type === "ARC_JUMP_PLAY_REQUEST") {
        onPlayRequest();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onGameOver, onPlayRequest]);

  useEffect(() => {
    if (startNonce > 0) {
      iframeRef.current?.contentWindow?.postMessage({ type: "ARC_JUMP_START_GAME" }, window.location.origin);
    }
  }, [startNonce]);

  return (
    <iframe
      ref={iframeRef}
      src="/arc-jump/index.html"
      title="ARC JumpCoin gameplay"
      className="relative z-10 block h-screen min-h-[640px] w-full border-0"
    />
  );
}
