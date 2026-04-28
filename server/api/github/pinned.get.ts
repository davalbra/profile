const githubUsername = "davalbra";
const pinnedRepos = ["davalbra", "profile", "lynxInit", "rsbuild-plugin-tailwindcss"];

type GitHubRepositoryResponse = {
  name: string;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  private: boolean;
};

const githubToken = process.env.GITHUB_TOKEN;

const githubHeaders: HeadersInit = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
};

const toFallbackRepository = (repoName: string) => ({
  name: repoName,
  description: "Repositorio disponible en GitHub con implementación activa.",
  htmlUrl: `https://github.com/${githubUsername}/${repoName}`,
  homepage: null,
  stars: 0,
  forks: 0,
  language: "Sin dato",
  updatedAt: new Date().toISOString(),
});

const fetchPinnedRepository = async (repoName: string) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${githubUsername}/${encodeURIComponent(repoName)}`,
      {
        headers: githubHeaders,
      },
    );

    if (!response.ok) {
      return toFallbackRepository(repoName);
    }

    const payload = (await response.json()) as GitHubRepositoryResponse;
    if (payload.private) {
      return toFallbackRepository(repoName);
    }

    return {
      name: payload.name,
      description: "Repositorio disponible en GitHub con implementación activa.",
      htmlUrl: payload.html_url,
      homepage: payload.homepage || null,
      stars: payload.stargazers_count,
      forks: payload.forks_count,
      language: payload.language || "Sin dato",
      updatedAt: payload.updated_at,
    };
  } catch {
    return toFallbackRepository(repoName);
  }
};

export default defineEventHandler(async () => {
  const repos = await Promise.all(pinnedRepos.map((repoName) => fetchPinnedRepository(repoName)));

  return {
    repos,
  };
});
