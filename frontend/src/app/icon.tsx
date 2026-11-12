import { ImageResponse } from "next/og";
import { PawIcon } from "@/components/paw-icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<PawIcon size={64} />, size);
}
