import { petAvatar } from "@/lib/brand";
import type { Pet } from "@/lib/types";
import { cx } from "./ui";

export function PetAvatar({ pet, className }: { pet: Pick<Pet, "name">; className?: string }) {
  const src = petAvatar(pet);
  return (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft",
        className ?? "size-12 text-2xl",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={pet.name} className="size-full object-cover" />
      ) : (
        <span aria-hidden>🐾</span>
      )}
    </div>
  );
}
