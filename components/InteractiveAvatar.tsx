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
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";
import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);

  function baseApiUrl() {
    return process.env.NEXT_PUBLIC_BASE_API_URL;
  }

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

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
      basePath: baseApiUrl(),
    });

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
      const res = await avatar.current.createStartAvatar({
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

      setData(res);
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false,
      });
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current
      .speak({ text: text, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC })
      .catch((e) => {
        setDebug(e.message);
      });
    setIsLoadingRepeat(false);
  }

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      setDebug(e.message);
    });
  }

  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) return;
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else {
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 text-white">
      {stream ? (
        <div className="relative flex flex-col items-center justify-center bg-black rounded-lg overflow-hidden">
          <video
            ref={mediaStream}
            autoPlay
            playsInline
            className="w-full h-auto object-contain"
          >
            <track kind="captions" />
          </video>
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

      <div className="mt-2">
        {chatMode === "text_mode" ? (
          <div className="relative w-full">
            <InteractiveAvatarTextInput
              disabled={!stream}
              input={text}
              label="Chat"
              loading={isLoadingRepeat}
              placeholder="Type something for the avatar to respond"
              setInput={setText}
              onSubmit={handleSpeak}
            />
            {text && (
              <div className="absolute right-2 top-2">
                <Chip size="sm">Listening</Chip>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full text-center">
            <Button
              isDisabled={!isUserTalking}
              className="bg-gradient-to-tr from-indigo-500 to-indigo-300"
              size="sm"
              variant="shadow"
            >
              {isUserTalking ? "Listening" : "Voice chat"}
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs font-mono text-right">{debug}</p>
    </div>
  );
}
