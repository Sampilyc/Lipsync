import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { usePrevious } from "ahooks";

import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

/**
 * Esta versión:
 * - Elimina por completo los Tabs ("Text mode"/"Voice mode").
 * - Usa SIEMPRE "Voice mode".
 * - Mantiene la parte inicial para Custom Knowledge, etc.
 * - Mantiene los botones "Interrupt" y "End session".
 */
export default function InteractiveAvatar() {
  // Estados
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [data, setData] = useState<StartAvatarResponse>();
  const [isUserTalking, setIsUserTalking] = useState(false);

  // Refs
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);

  // Helpers
  function baseApiUrl() {
    return process.env.NEXT_PUBLIC_BASE_API_URL;
  }

  // Obtén el token del endpoint local
  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      console.log("Access Token:", token);
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }
    return "";
  }

  // Iniciar sesión en modo voz directamente
  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: await newToken,
      basePath: baseApiUrl(),
    });

    // Listeners
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log("Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log("User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log("User stopped talking:", event);
      setIsUserTalking(false);
    });

    try {
      // Crear la sesión
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId,
        knowledgeId: knowledgeId,
        voice: {
          rate: 1.5, // velocidad
          emotion: VoiceEmotion.EXCITED,
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);

      // Arranca el modo voz inmediatamente
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false,
      });
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  // Interrumpir el habla actual del avatar
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      setDebug(e.message);
    });
  }

  // Finalizar la sesión y el stream
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  // (Opcional) Usado anteriormente para "hablar texto" (text mode), lo dejamos por si lo necesitás.
  async function handleSpeak(text: string) {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current
      .speak({
        text,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      })
      .catch((e) => {
        setDebug(e.message);
      });
    setIsLoadingRepeat(false);
  }

  // Efecto: asignar el video al <video> cuando se obtenga el stream
  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  // Al desmontar el comp, cerrar la sesión
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  // Bloque UI
  return (
    <div className="w-full flex flex-col gap-4 p-4 text-white">
      {stream ? (
        // Avatar con video
        <div className="relative flex flex-col items-center justify-center bg-black rounded-lg overflow-hidden">
          <video
            ref={mediaStream}
            autoPlay
            playsInline
            className="w-full h-auto object-contain"
          >
            <track kind="captions" />
          </video>
          {/* Botones superpuestos */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-2">
            <Button
              className="bg-gradient-to-tr from-indigo-500 to-indigo-300 rounded-lg"
              size="sm"
              variant="shadow"
              onClick={handleInterrupt}
            >
              Interrupt
            </Button>
            <Button
              className="bg-gradient-to-tr from-indigo-500 to-indigo-300 rounded-lg"
              size="sm"
              variant="shadow"
              onClick={endSession}
            >
              End session
            </Button>
          </div>
        </div>
      ) : !isLoadingSession ? (
        // Pantalla previa (seleccionar info y arrancar sesión)
        <div className="flex flex-col gap-4 w-full items-center justify-center">
          <div className="flex flex-col gap-2 w-full">
            <Input
              placeholder="Custom Knowledge ID (optional)"
              value={knowledgeId}
              onChange={(e) => setKnowledgeId(e.target.value)}
              size="sm"
            />
            <Input
              placeholder="Custom Avatar ID (optional)"
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
              size="sm"
            />
            <Select
              placeholder="Select an example avatar"
              size="sm"
              onChange={(e) => setAvatarId(e.target.value)}
            >
              {AVATARS.map((av) => (
                <SelectItem key={av.avatar_id} textValue={av.avatar_id}>
                  {av.name}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="Select language"
              placeholder="Select language"
              size="sm"
              className="max-w-xs"
              selectedKeys={[language]}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {STT_LANGUAGE_LIST.map((lang) => (
                <SelectItem key={lang.key}>{lang.label}</SelectItem>
              ))}
            </Select>
          </div>
          <Button
            className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full"
            size="sm"
            variant="shadow"
            onClick={startSession}
          >
            Start session
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <Spinner color="default" size="lg" />
        </div>
      )}

      {/* Opcional: Si querés un debug o texto de estado */}
      <p className="text-xs font-mono text-right">{debug}</p>
    </div>
  );
}
