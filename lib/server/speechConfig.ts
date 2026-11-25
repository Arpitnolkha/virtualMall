import type { TurnDetectionConfig } from 'agora-agents';

// ARES receives this list as asr.language = "en-IN,hi-IN" on the wire.
// Hinglish uses the English/Hindi pair; it is not a separate language tag.
export const showroomTurnDetection = {
    language: ['en-IN', 'hi-IN'],
    config: { end_of_speech: { mode: 'vad' } },
} satisfies TurnDetectionConfig;
