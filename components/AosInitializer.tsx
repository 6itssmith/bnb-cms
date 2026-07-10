"use client";

import { useEffect } from "react";
import AOS from "aos";

/** Initializes the shared scroll-reveal treatment for the static CMS. */
export default function AosInitializer() {
  useEffect(() => {
    AOS.init({
      duration: 650,
      easing: "ease-out-cubic",
      once: true,
      offset: 24,
    });
  }, []);

  return null;
}
