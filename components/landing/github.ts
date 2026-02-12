import { Flame, GitCommitHorizontal } from "lucide-react";
import { githubUsername, heatmapLevels } from "@/components/landing/data";
import type {
  ActivityStat,
  EngineeringActivityData,
  GitHubContributionsResponse,
  GitHubRepoListItemResponse,
  GitHubRepositoryResponse,
  GitHubUserEventResponse,
  LanguageBreakdownItem,
  PinnedRepositoryCard,
  RecentPushItem,
} from "@/components/landing/types";

const githubToken =
  process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.NEXT_GITHUB_TOKEN;

const githubHeaders: HeadersInit = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
};

const languageColors = ["bg-[#137fec]", "bg-sky-400", "bg-cyan-400", "bg-indigo-400"];

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatRelativeDate(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `hace ${minutes} min`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `hace ${hours} h`;
  }

  const days = Math.max(1, Math.floor(diffMs / day));
  return `hace ${days} d`;
}

function toPinnedRepositoryCard(
  repoName: string,
  payload: GitHubRepositoryResponse | null,
): PinnedRepositoryCard {
  if (!payload) {
    return {
      name: repoName,
      description: "Repositorio disponible en GitHub.",
      htmlUrl: `https://github.com/${githubUsername}/${repoName}`,
      homepage: null,
      stars: 0,
      forks: 0,
      language: "Sin dato",
      updatedAt: new Date().toISOString(),
    };
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
}

async function fetchGitHubJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: githubHeaders, next: { revalidate: 1800 } });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchPinnedRepository(repoName: string): Promise<PinnedRepositoryCard> {
  const payload = await fetchGitHubJson<GitHubRepositoryResponse>(
    `https://api.github.com/repos/${githubUsername}/${encodeURIComponent(repoName)}`,
  );

  if (!payload || payload.private) {
    return toPinnedRepositoryCard(repoName, null);
  }

  return toPinnedRepositoryCard(repoName, payload);
}

export async function getPinnedRepositories(repoNames: string[]): Promise<PinnedRepositoryCard[]> {
  return Promise.all(repoNames.map((repoName) => fetchPinnedRepository(repoName)));
}

function normalizePushType(message: string): string {
  const prefix = message.split(":")[0]?.trim().toLowerCase();
  if (!prefix) {
    return "update";
  }
  return prefix.slice(0, 12);
}

function buildFallbackHeatmap(events: GitHubUserEventResponse[]): {
  heatmap: number[][];
  dailyCounts: Map<string, number>;
} {
  const dailyCounts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }
    const dateKey = event.created_at.slice(0, 10);
    const current = dailyCounts.get(dateKey) || 0;
    dailyCounts.set(dateKey, current + (event.payload?.size || 1));
  }

  const totalDays = 38 * 7;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));

  const values: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    values.push(dailyCounts.get(date.toISOString().slice(0, 10)) || 0);
  }

  const maxValue = Math.max(...values, 0);
  const normalized = values.map((count) => {
    if (count <= 0 || maxValue <= 0) {
      return 0;
    }
    const ratio = count / maxValue;
    if (ratio <= 0.25) {
      return 1;
    }
    if (ratio <= 0.5) {
      return 2;
    }
    if (ratio <= 0.75) {
      return 3;
    }
    return 4;
  });

  const heatmap = Array.from({ length: 38 }, (_, weekIndex) =>
    normalized.slice(weekIndex * 7, weekIndex * 7 + 7),
  );

  return { heatmap, dailyCounts };
}

function calculateStreaks(dailyCounts: Map<string, number>): { current: number; best: number } {
  const entries = [...dailyCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let best = 0;
  let running = 0;
  let previousDate: string | null = null;

  for (const [dateKey, count] of entries) {
    if (count <= 0) {
      running = 0;
      previousDate = dateKey;
      continue;
    }

    if (!previousDate) {
      running = 1;
    } else {
      const prev = new Date(`${previousDate}T00:00:00.000Z`);
      prev.setUTCDate(prev.getUTCDate() + 1);
      const expectedNext = prev.toISOString().slice(0, 10);
      running = expectedNext === dateKey ? running + 1 : 1;
    }

    if (running > best) {
      best = running;
    }
    previousDate = dateKey;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const anchorKey = (dailyCounts.get(todayKey) || 0) > 0 ? todayKey : yesterdayKey;

  let current = 0;
  const cursor = new Date(`${anchorKey}T00:00:00.000Z`);
  while ((dailyCounts.get(cursor.toISOString().slice(0, 10)) || 0) > 0) {
    current += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { current, best };
}

function getLast7DaysCommits(dailyCounts: Map<string, number>): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    total += dailyCounts.get(date.toISOString().slice(0, 10)) || 0;
  }
  return total;
}

async function getRecentEvents(): Promise<GitHubUserEventResponse[]> {
  const pages = [1, 2];
  const responses = await Promise.all(
    pages.map((page) =>
      fetchGitHubJson<GitHubUserEventResponse[]>(
        `https://api.github.com/users/${githubUsername}/events/public?per_page=100&page=${page}`,
      ),
    ),
  );

  return responses.flatMap((events) => events || []);
}

async function getLanguageBreakdownFromGitHub(): Promise<LanguageBreakdownItem[]> {
  const repos =
    (await fetchGitHubJson<GitHubRepoListItemResponse[]>(
      `https://api.github.com/users/${githubUsername}/repos?per_page=100&type=owner&sort=updated`,
    )) || [];

  const totals = new Map<string, number>();
  for (const repo of repos) {
    if (repo.fork || !repo.language) {
      continue;
    }
    const size = Math.max(repo.size || 0, 1);
    totals.set(repo.language, (totals.get(repo.language) || 0) + size);
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const totalTop = ranked.reduce((sum, [, size]) => sum + size, 0);

  if (!ranked.length || totalTop === 0) {
    return [
      { name: "TypeScript", share: 40, color: languageColors[0] },
      { name: "Python", share: 32, color: languageColors[1] },
      { name: "SQL", share: 18, color: languageColors[2] },
      { name: "Other", share: 10, color: languageColors[3] },
    ];
  }

  return ranked.map(([name, size], index) => ({
    name,
    share: (size / totalTop) * 100,
    color: languageColors[index] || languageColors[languageColors.length - 1],
  }));
}

async function getContributionData(events: GitHubUserEventResponse[]): Promise<{
  totalCommits: number;
  heatmap: number[][];
  dailyCounts: Map<string, number>;
}> {
  const fallback = buildFallbackHeatmap(events);
  const fallbackTotal = [...fallback.dailyCounts.values()].reduce((sum, value) => sum + value, 0);

  if (!githubToken) {
    return {
      totalCommits: fallbackTotal,
      heatmap: fallback.heatmap,
      dailyCounts: fallback.dailyCounts,
    };
  }

  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  const to = new Date();

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${githubToken}`,
      },
      body: JSON.stringify({
        query,
        variables: { login: githubUsername, from: from.toISOString(), to: to.toISOString() },
      }),
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return {
        totalCommits: fallbackTotal,
        heatmap: fallback.heatmap,
        dailyCounts: fallback.dailyCounts,
      };
    }

    const payload = (await response.json()) as GitHubContributionsResponse;
    const weeks = payload.data?.user?.contributionsCollection.contributionCalendar.weeks || [];
    const totalCommits =
      payload.data?.user?.contributionsCollection.totalCommitContributions || fallbackTotal;

    if (!weeks.length) {
      return {
        totalCommits,
        heatmap: fallback.heatmap,
        dailyCounts: fallback.dailyCounts,
      };
    }

    const levelMap = {
      NONE: 0,
      FIRST_QUARTILE: 1,
      SECOND_QUARTILE: 2,
      THIRD_QUARTILE: 3,
      FOURTH_QUARTILE: 4,
    } as const;

    const selectedWeeks = weeks.slice(-38);
    const dailyCounts = new Map<string, number>();
    const heatmap = selectedWeeks.map((week) =>
      week.contributionDays.map((day) => {
        dailyCounts.set(day.date, day.contributionCount);
        return levelMap[day.contributionLevel] ?? 0;
      }),
    );

    return { totalCommits, heatmap, dailyCounts };
  } catch {
    return {
      totalCommits: fallbackTotal,
      heatmap: fallback.heatmap,
      dailyCounts: fallback.dailyCounts,
    };
  }
}

function buildRecentPushes(events: GitHubUserEventResponse[]): RecentPushItem[] {
  const pushEvents = events.filter((event) => event.type === "PushEvent");
  const commits = pushEvents.flatMap((event) =>
    (event.payload?.commits || []).map((commit) => ({
      sha: commit.sha,
      message: commit.message.split("\n")[0] || "update repository",
      repo: event.repo.name,
      createdAt: event.created_at,
    })),
  );

  if (!commits.length) {
    return [
      {
        type: "update",
        message: "No recent pushes available right now.",
        repo: `${githubUsername}/portfolio`,
        time: "n/a",
        active: true,
      },
    ];
  }

  const unique = new Map<string, (typeof commits)[number]>();
  for (const commit of commits) {
    if (!unique.has(commit.sha)) {
      unique.set(commit.sha, commit);
    }
  }

  return [...unique.values()].slice(0, 3).map((commit, index) => ({
    type: normalizePushType(commit.message),
    message: commit.message,
    repo: commit.repo,
    time: formatRelativeDate(commit.createdAt),
    active: index === 0,
  }));
}

export async function getEngineeringActivity(): Promise<EngineeringActivityData> {
  const [events, languageBreakdown] = await Promise.all([
    getRecentEvents(),
    getLanguageBreakdownFromGitHub(),
  ]);

  const contribution = await getContributionData(events);
  const recentPushes = buildRecentPushes(events);
  const streaks = calculateStreaks(contribution.dailyCounts);
  const commitsLast7d = getLast7DaysCommits(contribution.dailyCounts);
  const lastUpdatedAt = events[0]?.created_at || new Date().toISOString();

  const keyStats: ActivityStat[] = [
    {
      label: githubToken ? "Commits (12m)" : "Recent Commits",
      value: formatCompact(contribution.totalCommits),
      detail: `${formatCompact(commitsLast7d)} in last 7d`,
      icon: GitCommitHorizontal,
      iconClassName: "text-[#5faaf3]",
      detailClassName: "text-emerald-400",
      trending: true,
    },
    {
      label: "Current Streak",
      value: String(streaks.current),
      suffix: "days",
      detail: `Personal best: ${streaks.best} days`,
      icon: Flame,
      iconClassName: "text-orange-400",
      detailClassName: "text-slate-400",
      trending: false,
    },
  ];

  return {
    keyStats,
    languageBreakdown,
    recentPushes,
    contributionHeatmap: contribution.heatmap,
    lastUpdatedAt,
  };
}

export { heatmapLevels };
