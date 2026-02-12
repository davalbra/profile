import type { LucideIcon } from "lucide-react";

export type Service = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type StackGroup = {
  name: string;
  items: Array<{ label: string; color: string }>;
};

export type GitHubRepositoryResponse = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  private: boolean;
};

export type PinnedRepositoryCard = {
  name: string;
  description: string;
  htmlUrl: string;
  homepage: string | null;
  stars: number;
  forks: number;
  language: string;
  updatedAt: string;
};

export type GitHubRepoListItemResponse = {
  language: string | null;
  size: number;
  fork: boolean;
};

export type GitHubUserEventResponse = {
  type: string;
  repo: { name: string };
  created_at: string;
  payload?: {
    size?: number;
    commits?: Array<{ sha: string; message: string }>;
  };
};

export type GitHubContributionsResponse = {
  data?: {
    user?: {
      contributionsCollection: {
        totalCommitContributions: number;
        contributionCalendar: {
          weeks: Array<{
            contributionDays: Array<{
              date: string;
              contributionCount: number;
              contributionLevel:
                | "NONE"
                | "FIRST_QUARTILE"
                | "SECOND_QUARTILE"
                | "THIRD_QUARTILE"
                | "FOURTH_QUARTILE";
            }>;
          }>;
        };
      };
    };
  };
};

export type ActivityStat = {
  label: string;
  value: string;
  suffix?: string;
  detail: string;
  icon: LucideIcon;
  iconClassName: string;
  detailClassName: string;
  trending: boolean;
};

export type LanguageBreakdownItem = {
  name: string;
  share: number;
  color: string;
};

export type RecentPushItem = {
  type: string;
  message: string;
  repo: string;
  time: string;
  active: boolean;
};

export type EngineeringActivityData = {
  keyStats: ActivityStat[];
  languageBreakdown: LanguageBreakdownItem[];
  recentPushes: RecentPushItem[];
  contributionHeatmap: number[][];
  lastUpdatedAt: string;
};

export type FeaturedDeployment = {
  title: string;
  description: string;
  icon: LucideIcon;
  repoUrl: string;
  demoUrl: string;
  tags: Array<{ name: string; className: string }>;
  iconShellClassName: string;
  iconClassName: string;
  cardPatternClassName: string;
};

export type PinnedRepositoryView = PinnedRepositoryCard & {
  starsText: string;
  forksText: string;
  updatedText: string;
};
