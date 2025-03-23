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
import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

/**
 * - Siempre "Voice mode", sin selector.
 * - El video se muestra con object-cover (hace zoom/crop) para llenar el contenedor 9:16.
 * - Botones "Interrupt" y "End session" superpuestos en la esquina inferior derecha.
 * - Formulario inicial para ID de avatar, knowledge, etc.
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

  // Obtiene el token del endpoint local
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

  // Efecto: asignar el video al <video> cuando se obtenga el stream
  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [stream]);

  // Al desmontar el componente, cerrar la sesión
  useEffect(() => {
    return () => {
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // Ocupa todo el contenedor 9:16 (ver /app/page.tsx)
    <div className="w-full h-full flex flex-col text-white">
      {stream ? (
        // Avatar con video a pantalla completa (object-cover)
        <div className="relative w-full h-full bg-black overflow-hidden">
          <video
            ref={mediaStream}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <track kind="captions" />
          </video>
          {/* Botones superpuestos en la esquina inferior derecha */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-2 z-10">
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

          {/* (Opcional) Muestra algo si el usuario está hablando */}
          {isUserTalking && (
            <div className="absolute top-3 left-3 bg-black bg-opacity-60 px-2 py-1 rounded text-sm">
              <p>Listening...</p>
            </div>
          )}
        </div>
      ) : !isLoadingSession ? (
        // Pantalla previa (seleccionar info y arrancar sesión)
        <div className="flex flex-col gap-4 w-full h-full items-center justify-center p-4 bg-black">
          <div className="flex flex-col gap-2 w-full max-w-xs">
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
            className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full max-w-xs"
            size="sm"
            variant="shadow"
            onClick={startSession}
          >
            Start session
          </Button>
        </div>
      ) : (
        // Loading spinner
        <div className="flex items-center justify-center w-full h-full bg-black">
          <Spinner color="default" size="lg" />
        </div>
      )}

      {/* Debug info en la parte de abajo a la derecha */}
      {debug && (
        <p className="text-xs font-mono absolute bottom-1 right-1 opacity-70">
          {debug}
        </p>
      )}
    </div>
  );
}
