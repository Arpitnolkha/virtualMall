"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { AgoraConversationController } from "@/lib/agora/conversation";
import { initialVoiceStatus, type VoiceStatus } from "@/lib/agora/conversation";
import {
  upsertTranscript,
  type TranscriptStreamEvent,
} from "@/lib/agora/transcriptStream";
import type { Timings } from "@/lib/latency/metrics";
import { handoffSummary, type HandoffState } from "./handoff";
import type { MallContextState, MallProduct } from "@/types/mall";
import type {
  ConversationController,
  ConversationState,
  TranscriptMessage,
} from "@/types/conversation";
import {
  PlaceholderShopkeeper,
  type AvatarState,
} from "@/lib/avatar/shopkeeperAvatar";
import {
  MockConversationController,
} from "@/lib/conversation/mockConversation";
import type { MallEvent } from "./mallEvents";
import { products } from "./products";
export const initialState: MallContextState = {
  activeProduct: null,
  previousProduct: null,
  conversationState: "idle",
  avatarState: "loading",
  messages: [],
};
type Action =
  | { type: "clear" }
  | { type: "transcripts"; messages: TranscriptMessage[] }
  | { type: "select"; product: MallProduct | null }
  | { type: "message"; message: TranscriptMessage }
  | { type: "conversation"; state: ConversationState }
  | { type: "avatar"; state: AvatarState };
export function mallReducer(
  state: MallContextState,
  action: Action,
): MallContextState {
  switch (action.type) {
    case "clear":
      return { ...state, messages: [] };
    case "transcripts":
      return { ...state, messages: action.messages };
    case "select":
      return {
        ...state,
        previousProduct: state.activeProduct,
        activeProduct: action.product,
      };
    case "message":
      return {
        ...state,
        messages: [...state.messages, action.message].slice(-40),
      };
    case "conversation":
      return { ...state, conversationState: action.state };
    case "avatar":
      return { ...state, avatarState: action.state };
  }
}
type Context = {
  state: MallContextState;
  handleProductSelected: (p: MallProduct) => void;
  ask: (q: string) => void;
  shoppingFeedback: (text: string) => Promise<void>;
  dispatchEvent: (e: MallEvent) => void;
  voice: VoiceStatus;
  connectVoice: (audioOnly?: boolean) => Promise<void>;
  disconnectVoice: (audioOnly?: boolean) => Promise<void>;
  toggleMute: () => void;
  resumeAudio: () => void;
  retryAvatar: () => void;
  debug: boolean;
  timings: Timings;
  markMallLoaded: () => void;
  handoff: HandoffState;
  handoffContext: ReturnType<typeof handoffSummary> | null;
};
const MallContext = createContext<Context | null>(null);
const SelectionContext = createContext<{
  activeProduct: MallProduct | null;
  handleProductSelected: (p: MallProduct) => void;
} | null>(null);
const AvatarContext = createContext<{
  state: AvatarState;
  video: HTMLVideoElement | null;
}>({ state: "loading", video: null });
const subscribeDebug = () => () => {};
export function MallProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(mallReducer, initialState);
  const [voice, setVoice] = useState<VoiceStatus>(initialVoiceStatus);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [timings, setTimings] = useState<Timings>({});
  const [handoff, setHandoff] = useState<HandoffState>("none");
  const [handoffContext, setHandoffContext] = useState<ReturnType<
    typeof handoffSummary
  > | null>(null);
  const debug = useSyncExternalStore(
    subscribeDebug,
    () =>
      new URLSearchParams(window.location.search).get("debugLatency") ===
      "true",
    () => false,
  );
  const conversation = useRef<ConversationController | null>(null);
  const live = useRef<AgoraConversationController | null>(null);
  const product = useRef<MallProduct | null>(null);
  const mounted = useRef(false);
  const connecting = useRef(false);
  const connectionGeneration = useRef(0);
  const liveEvents = useRef<TranscriptStreamEvent[]>([]);
  useEffect(() => {
    const lifecycle = connectionGeneration;
    mounted.current = true;
    // Warm browser-only modules while the visitor explores. No media capture.
    void import("@/lib/agora/conversation").catch(() => {});
    void import("@/lib/agora/rtcSession")
      .then(({ preloadRtcSdk }) => preloadRtcSdk())
      .catch(() => {});
    const a = new PlaceholderShopkeeper((s) =>
      dispatch({ type: "avatar", state: s }),
    );
    const c = new MockConversationController({
      message: (message) => dispatch({ type: "message", message }),
      state: (s, v) => {
        dispatch({ type: "conversation", state: s });
        a.setState(v);
      },
    });
    conversation.current = c;
    void a.initialize();
    const leave = () => {
      void live.current?.dispose();
    };
    window.addEventListener("pagehide", leave);
    return () => {
      mounted.current = false;
      lifecycle.current++;
      connecting.current = false;
      c.dispose();
      a.dispose();
      void live.current?.dispose();
      live.current = null;
      conversation.current = null;
      window.removeEventListener("pagehide", leave);
    };
  }, []);
  const ask = useCallback((q: string) => {
    if (live.current) void live.current.ask(q);
    else if (product.current) conversation.current?.ask(q, product.current);
  }, []);
  const disconnectVoice = useCallback(async () => {
    const generation = ++connectionGeneration.current;
    connecting.current = false;
    const old = live.current;
    live.current = null;
    await old?.dispose();
    if (mounted.current && generation === connectionGeneration.current) {
      setVideo(null);
      setVoice(initialVoiceStatus);
      dispatch({ type: "avatar", state: "idle" });
      dispatch({ type: "conversation", state: "ready" });
    }
  }, []);
  const connectVoice = useCallback(
    async (audioOnly = false) => {
      if (connecting.current) return;
      const stopping = disconnectVoice();
      const generation = connectionGeneration.current;
      connecting.current = true;
      try {
        await stopping;
        if (!mounted.current || generation !== connectionGeneration.current) return;
        conversation.current?.cancel();
        setVoice(v => ({...v, phase: "connecting", mic: "connecting", error: null}));
        const { AgoraConversationController } =
          await import("@/lib/agora/conversation");
        if (!mounted.current || generation !== connectionGeneration.current) return;
        const controller = new AgoraConversationController(
          {
            status: (patch) => {
              if (mounted.current && live.current === controller)
                setVoice((v) => ({ ...v, ...patch }));
            },
            avatar: (s) => {
              if (mounted.current && live.current === controller) {
                dispatch({ type: "avatar", state: s });
                dispatch({
                  type: "conversation",
                  state:
                    s === "loading"
                      ? "connecting"
                      : s === "greeting"
                        ? "speaking"
                        : s,
                });
              }
            },
            video: (v) => {
              if (mounted.current && live.current === controller) setVideo(v);
            },
            clear: () => {
              if (!mounted.current || live.current !== controller) return;
              liveEvents.current = [];
              dispatch({ type: "clear" });
            },
            transcript: (e) => {
              if (!mounted.current || live.current !== controller) return;
              const next = upsertTranscript(
                liveEvents.current,
                e,
                e.conversationId!,
              );
              if (next === liveEvents.current) return;
              liveEvents.current = next;
              dispatch({
                type: "transcripts",
                messages: next.map((m) => ({
                  id: m.messageId,
                  role: m.speaker === "user" ? "user" : "maya",
                  text: m.text,
                  final: m.final,
                  conversationId: m.conversationId,
                  timestamp: m.timestamp,
                })),
              });
            },
            timing: (t) => {
              if (mounted.current && live.current === controller)
                setTimings((v) => ({ ...t, mallLoadedAt: v.mallLoadedAt }));
            },
          },
          debug,
          audioOnly,
        );
        live.current = controller;
        if (product.current) controller.selectProduct(product.current);
        await controller.connect();
      } finally {
        if (generation === connectionGeneration.current) connecting.current = false;
      }
    },
    [debug, disconnectVoice],
  );
  const handleProductSelected = useCallback((p: MallProduct) => {
    product.current = p;
    dispatch({ type: "select", product: p });
    conversation.current?.cancel();
    if (live.current && voice.phase !== "error") live.current.selectProduct(p);
    else void connectVoice();
  }, [connectVoice, voice.phase]);
  const toggleMute = useCallback(() => {
    void live.current?.toggleMute();
  }, []);
  const resumeAudio = useCallback(() => live.current?.resumeAudio(), []);
  const retryAvatar = useCallback(() => {
    void connectVoice();
  }, [connectVoice]);
  const dispatchEvent = useCallback(
    (e: MallEvent) => {
      if (e.type === "PRODUCT_SELECTED") {
        const p = products.find((x) => x.id === e.productId);
        if (p) handleProductSelected(p);
      }
      if (e.type === "PRODUCT_DESELECTED") {
        product.current = null;
        dispatch({ type: "select", product: null });
        if (live.current) live.current.selectProduct(null);
        else {
          conversation.current?.cancel();
          dispatch({ type: "avatar", state: "idle" });
        }
      }
      if (
        e.type === "HUMAN_HANDOFF_CONNECTED" &&
        Number.isSafeInteger(e.uid) &&
        e.uid > 0
      ) {
        void live.current
          ?.handoff(e.uid)
          .then(() => setHandoff("connected"))
          .catch(() => setHandoff("waiting"));
      }
      if (e.type === "HUMAN_HANDOFF_REQUESTED") {
        setHandoff("requested");
        /* Summary is prepared locally; there is no contact-center endpoint. */ setHandoffContext(
          handoffSummary(product.current),
        );
      }
    },
    [handleProductSelected],
  );
  const markMallLoaded = useCallback(() => {
    if (debug) setTimings((t) => ({ ...t, mallLoadedAt: performance.now() }));
  }, [debug]);
  const selection = useMemo(
    () => ({ activeProduct: state.activeProduct, handleProductSelected }),
    [state.activeProduct, handleProductSelected],
  );
  const avatarValue = useMemo(
    () => ({ state: state.avatarState, video }),
    [state.avatarState, video],
  );
  return (
    <SelectionContext.Provider value={selection}>
      <AvatarContext.Provider value={avatarValue}>
        <MallContext.Provider
          value={{
            state,
            handleProductSelected,
            ask,
            shoppingFeedback: async (text) => { if (!live.current) throw new Error("Maya is not connected."); await live.current.shoppingFeedback(text); },
            dispatchEvent,
            voice,
            connectVoice,
            disconnectVoice,
            toggleMute,
            resumeAudio,
            retryAvatar,
            debug,
            timings,
            markMallLoaded,
            handoff,
            handoffContext,
          }}
        >
          {children}
        </MallContext.Provider>
      </AvatarContext.Provider>
    </SelectionContext.Provider>
  );
}
export function useMall() {
  const c = useContext(MallContext);
  if (!c) throw new Error("MallProvider is required");
  return c;
}
export function useMallSelection() {
  const c = useContext(SelectionContext);
  if (!c) throw new Error("MallProvider is required");
  return c;
}
export function useMallAvatar() {
  return useContext(AvatarContext);
}
