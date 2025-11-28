import { auth } from "@/auth";
import { ConnectGithubBtn } from "@/components/github/ConnectGithubBtn";
import { RepoSelector } from "@/components/github/RepoSelector";

export default async function HomePage() {
  const session = await auth();
  const isConnected = Boolean(session?.accessToken);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <section className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          DevStudio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Build production-ready apps with AI and deploy with one click.
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          Connect your GitHub account, let DevStudio generate your application, and
          push straight to your repository using secure OAuth tokens. No copy/paste,
          no secret management.
        </p>
      </section>

      <section className="rounded-2xl border bg-card/50 p-8 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              1. Connect GitHub
            </p>
            <p className="text-lg font-semibold">
              {isConnected
                ? "GitHub connected with repo permissions"
                : "Authorize DevStudio to access your repositories"}
            </p>
            <p className="text-sm text-muted-foreground">
              We request the <code>repo</code> scope to create repositories and push code on your behalf.
            </p>
          </div>
          <div>
            <ConnectGithubBtn variant={isConnected ? "outline" : "default"} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card/50 p-8 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              2. Choose a repository
            </p>
            <p className="text-lg font-semibold">
              {isConnected
                ? "Select the repo DevStudio should deploy to"
                : "Connect GitHub to load your repositories"}
            </p>
          </div>
          {isConnected ? (
            <RepoSelector />
          ) : (
            <p className="text-sm text-muted-foreground">
              Once your GitHub account is connected with repo scope, your repositories will appear here.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
