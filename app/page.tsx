"use client";

import Image from "next/image";
import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function App() {
  return (
    <div className="w-screen h-screen bg-[#212121] flex items-center justify-center p-0 m-0">
      {/* Contenedor 9:16, con posición relativa para superponer el logo */}
      <div className="w-full max-w-[100vh] aspect-[9/16] relative">
        <InteractiveAvatar />
        {/* Logo superpuesto en la parte superior central */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
          <Image
            src="/logo-logicoycreativo.png"
            alt="Logo Lógico y Creativo"
            width={180}
            height={80}
            priority
          />
        </div>
      </div>
    </div>
  );
}
