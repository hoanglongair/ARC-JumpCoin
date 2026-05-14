"use client";

export function GamePlaceholder({ onEnd }: { onEnd: () => void }) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-8">
      <div className="rounded-lg border border-line bg-panel p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-mint">Session active</p>
            <h1 className="mt-2 text-3xl font-semibold">ARC JumpCoin</h1>
          </div>
          <button
            type="button"
            onClick={onEnd}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-[#eef1e8]"
          >
            End session
          </button>
        </div>
        <div className="grid aspect-video place-items-center rounded-md border border-line bg-[#151816] text-white">
          <div className="text-center">
            <div className="text-5xl font-bold">GAME UNLOCKED</div>
            <p className="mt-3 text-sm text-white/70">Gameplay placeholder for the Payment MVP.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
