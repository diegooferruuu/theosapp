import { ImageResponse } from "next/og";
import { PawIcon } from "@/components/paw-icon";

const SIZES = [192, 512];

export const dynamic = "force-static";

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const px = SIZES.includes(Number(size)) ? Number(size) : 192;
  // Sin esquinas redondeadas: el sistema operativo aplica su propia máscara.
  return new ImageResponse(<PawIcon size={px} rounded={false} />, { width: px, height: px });
}
