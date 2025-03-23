"use client";

import Image from "next/image";
import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function App() {
  return (
    <div className="w-screen h-screen flex flex-col p-0 m-0 items-center justify-center bg-[#212121]">
      {/* Logo de Lógico y Creativo */}
      <div className="mt-4">
        <Image
          src="/logo-logicoycreativo.png"
          alt="Logo Lógico y Creativo"
          width={180}
          height={80}
          priority
        />
      </div>

      {/* Contenedor 9:16 */}
      <div className="w-full max-w-[100vh] aspect-[9/16] mt-2">
        <InteractiveAvatar />
      </div>
    </div>
  );
}
