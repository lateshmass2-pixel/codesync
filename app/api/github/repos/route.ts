import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken });
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });

    const repos = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description,
      htmlUrl: repo.html_url,
      updatedAt: repo.updated_at,
    }));

    return NextResponse.json({ repos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch repositories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    }

    const octokit = new Octokit({ auth: session.accessToken });
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name,
      auto_init: true,
      private: false,
    });

    const repo = {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      private: data.private,
      description: data.description,
      htmlUrl: data.html_url,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ repo });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create repository";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
