import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="illustration-halo rounded-full p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/theo-sleeping.webp" alt="Theo durmiendo" className="h-auto w-64" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Esta página no existe</h1>
      <p className="mt-1 text-sm text-muted">Theo buscó por todas partes y se quedó dormido.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-fg hover:bg-primary-strong"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
