"use client";

import { useEffect } from "react";

export default function PwaRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Push continua opcional; falha no registro não bloqueia a aplicação.
      });
    }
  }, []);
  return null;
}
