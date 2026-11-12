import { ImageResponse } from "next/og";
import { PawIcon } from "@/components/paw-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<PawIcon size={180} rounded={false} />, size);
}
