"use client";

import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function App() {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-0 m-0">
      <div className="w-full max-w-[100vh] aspect-[9/16]">
        <InteractiveAvatar />
      </div>
    </div>
  );
}
