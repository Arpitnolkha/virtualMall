import "server-only";
const required = [
  "AGORA_APP_ID",
  "AGORA_APP_CERTIFICATE",
  "MURF_API_KEY",
  "MURF_VOICE_ID",
] as const;
export function configuration() {
  return {
    voiceReady: required.every((k) => Boolean(process.env[k]?.trim())),
    avatarReady: Boolean(
      process.env.ANAM_API_KEY?.trim() && process.env.ANAM_AVATAR_ID?.trim(),
    ),
  };
}
export function requireConfiguration() {
  if (!configuration().voiceReady) throw new Error("CONFIGURATION_REQUIRED");
  const voiceId = process.env.MURF_VOICE_ID!.trim();
  if (voiceId.startsWith("{") || voiceId.startsWith("["))
    throw new Error("INVALID_TTS_VOICE_CONFIGURATION");
  return {
    appId: process.env.AGORA_APP_ID!,
    appCertificate: process.env.AGORA_APP_CERTIFICATE!,
    ttsKey: process.env.MURF_API_KEY!,
    voiceId,
  };
}
