import { featuredDeployments, heatmapLevels, pinnedRepos, services, stackGroups } from "@/components/landing/data";
import {
  formatCompact,
  formatRelativeDate,
  getEngineeringActivity,
  getPinnedRepositories,
} from "@/components/landing/github";
import {
  ActivitySection,
  ContactSection,
  HeroSection,
  NavbarSection,
  PinnedProjectsSection,
  ServicesSection,
  StackSection,
} from "@/components/landing/sections";
import type { PinnedRepositoryView } from "@/components/landing/types";

export default async function Home() {
  const [pinnedRepositoryCards, engineeringActivity] = await Promise.all([
    getPinnedRepositories(pinnedRepos),
    getEngineeringActivity(),
  ]);

  const pinnedRepositoryViews: PinnedRepositoryView[] = pinnedRepositoryCards.map((repo) => ({
    ...repo,
    starsText: formatCompact(repo.stars),
    forksText: formatCompact(repo.forks),
    updatedText: formatRelativeDate(repo.updatedAt),
  }));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#101922] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[size:40px_40px] [background-image:linear-gradient(to_right,rgba(19,127,236,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(19,127,236,0.07)_1px,transparent_1px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-140px] h-96 w-96 rounded-full bg-[#137fec]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[-110px] h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"
      />

      <NavbarSection />

      <main id="home" className="relative z-10 pt-24">
        <HeroSection />
        <ServicesSection services={services} />
        <StackSection stackGroups={stackGroups} />

        <ActivitySection
          keyStats={engineeringActivity.keyStats}
          languageBreakdown={engineeringActivity.languageBreakdown}
          recentPushes={engineeringActivity.recentPushes}
          contributionHeatmap={engineeringActivity.contributionHeatmap}
          heatmapLevels={heatmapLevels}
          featuredDeployments={featuredDeployments}
          lastUpdatedText={formatRelativeDate(engineeringActivity.lastUpdatedAt)}
        />

        <PinnedProjectsSection pinnedRepositoryCards={pinnedRepositoryViews} />
        <ContactSection />
      </main>

      <div className="fixed bottom-0 right-0 h-px w-1/3 bg-gradient-to-l from-[#137fec]/30 to-transparent" />
      <div className="fixed left-0 top-0 h-px w-1/3 bg-gradient-to-r from-[#137fec]/30 to-transparent" />
    </div>
  );
}
