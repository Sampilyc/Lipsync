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
  Spinner,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";

export default function InteractiveAvatar() {
  // Estados
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  // Parámetros internos
  const [knowledgeId] = useState<string>("0a260b1da86345f888cf8bc5ed3f4f7c");
  const [avatarId] = useState<string>("Santa_Fireplace_Front_public");
  const [language] = useState<string>("es");
  const [isUserTalking, setIsUserTalking] = useState(false);

  // Refs
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  // Acumulador para los fragmentos de lo que dice el avatar
  const accumulatedSpeech = useRef<string>("");

  // Helper: URL base de la API
  function baseApiUrl() {
    return process.env.NEXT_PUBLIC_BASE_API_URL;
  }

  // Obtiene el token del endpoint local
  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", { method: "POST" });
      const token = await response.text();
      console.log("Access Token:", token);
      return token;
    } catch (error) {
      console.error("Error al obtener el token de acceso:", error);
    }
    return "";
  }

  // Inicia la sesión en modo voz
  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
      basePath: baseApiUrl(),
    });

    // Listeners
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("El avatar comenzó a hablar.", e);
      // Reinicia el acumulador
      accumulatedSpeech.current = "";
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("El avatar terminó de hablar. (Metadatos):", e.detail);
    });
    // Acumula los fragmentos mientras el avatar habla
    avatar.current.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (e) => {
      const fragment = e.detail?.message;
      if (fragment) {
        accumulatedSpeech.current += fragment;
        console.log("Fragmento recibido:", fragment);
      }
    });
    // Cuando el avatar finaliza el mensaje, muestra el mensaje completo en la consola
    avatar.current.on(StreamingEvents.AVATAR_END_MESSAGE, (e) => {
      console.log("Mensaje final del avatar:", accumulatedSpeech.current);
      accumulatedSpeech.current = "";
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Transmisión desconectada.");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log("Transmisión lista:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log("El usuario empezó a hablar:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log("El usuario dejó de hablar:", event);
      setIsUserTalking(false);
    });

    try {
      await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId,
        knowledgeId: knowledgeId,
        voice: {
          rate: 1.5,
          emotion: VoiceEmotion.EXCITED,
        },
        language: language,
        disableIdleTimeout: true,
      });

      await avatar.current?.startVoiceChat({
        useSilencePrompt: false,
      });
    } catch (error) {
      console.error("Error al iniciar la sesión del avatar:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  // Interrumpe el habla actual del avatar
  async function handleInterrupt() {
    if (!avatar.current) {
      console.error("El avatar no está inicializado");
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      console.error(e.message);
    });
  }

  // Finaliza la sesión y el stream
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  // Asigna el stream al elemento <video> cuando esté listo
  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [stream]);

  // Al desmontar el componente, cierra la sesión
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col text-white font-sans relative">
      {stream ? (
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
              className="bg-gradient-to-tr from-[#ff6600] to-[#ff9152] rounded-lg"
              size="sm"
              variant="shadow"
              onClick={handleInterrupt}
            >
              Interrumpir
            </Button>
            <Button
              className="bg-gradient-to-tr from-[#ff6600] to-[#ff9152] rounded-lg"
              size="sm"
              variant="shadow"
              onClick={endSession}
            >
              Finalizar
            </Button>
          </div>
          {isUserTalking && (
            <div className="absolute top-3 left-3 bg-black bg-opacity-60 px-2 py-1 rounded text-sm">
              <p>Escuchando...</p>
            </div>
          )}
        </div>
      ) : !isLoadingSession ? (
        <div className="flex flex-col gap-4 w-full h-full items-center justify-center p-4 bg-[#212121]">
          {/* Pantalla previa: solo se muestra el botón "Comenzar" */}
          <Button
            className="bg-gradient-to-tr from-[#ff6600] to-[#ff9152] w-full max-w-xs"
            size="sm"
            variant="shadow"
            onClick={startSession}
          >
            Comenzar
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-[#212121]">
          <Spinner color="default" size="lg" />
        </div>
      )}
    </div>
  );
}
