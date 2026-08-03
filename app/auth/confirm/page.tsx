import { confirmToken } from "./actions";

// Landing page for invite / password-recovery links. Deliberately does NOT
// verify the token on load — only when the user clicks the button below, so
// mail providers prefetching this URL to scan it can't burn the one-time
// token before a human gets here.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">Presque terminé</h1>
        <p className="mb-6 text-sm text-gray-500">
          Cliquez ci-dessous pour continuer et accéder à votre espace.
        </p>
        <form action={confirmToken}>
          <input type="hidden" name="token_hash" value={token_hash ?? ""} />
          <input type="hidden" name="type" value={type ?? ""} />
          <input type="hidden" name="next" value={next ?? ""} />
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 py-2 font-medium text-white hover:bg-gray-800"
          >
            Continuer
          </button>
        </form>
      </div>
    </main>
  );
}
