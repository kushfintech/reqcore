<script setup lang="ts">
import { Rocket, TrendingUp, Globe, Briefcase, MapPin, ArrowRight, ChevronRight } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data: session } = await authClient.useSession(useFetch)

const values = computed(() => [
  { icon: Rocket, label: t('home.values.impact.label'), desc: t('home.values.impact.desc') },
  { icon: TrendingUp, label: t('home.values.growth.label'), desc: t('home.values.growth.desc') },
  { icon: Globe, label: t('home.values.flexible.label'), desc: t('home.values.flexible.desc') },
])

// ── Live open positions (same source as the /jobs board) ──
const { data: jobsData, status: jobsStatus } = await useFetch('/api/public/jobs', {
  key: 'home-jobs',
  query: { page: 1, limit: 5 },
})
const jobs = computed(() => jobsData.value?.data ?? [])
const totalJobs = computed(() => jobsData.value?.total ?? 0)

const typeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

useHead({ title: 'Careers' })
definePageMeta({ layout: false })
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-white dark:bg-[#09090b]">
    <!-- Ambient glow -->
    <div
      class="pointer-events-none absolute top-[-40%] left-1/2 h-[800px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.07]"
      style="background: radial-gradient(ellipse at center, var(--color-brand-500), transparent 70%)"
    />

    <PublicNavBar active-page="jobs" />

    <main class="relative mx-auto max-w-5xl px-6 pt-36 pb-24">
      <!-- ── Hero ── -->
      <div class="flex flex-col items-center text-center">
        <span class="hero-animate hero-delay-1 mb-6 inline-flex items-center rounded-full border border-surface-200 dark:border-white/[0.08] bg-surface-100 dark:bg-white/[0.03] px-3.5 py-1 text-[12px] font-medium text-surface-600 dark:text-surface-300">
          {{ $t('home.badge') }}
        </span>

        <h1 class="hero-animate hero-delay-1 text-5xl font-bold leading-[1.1] tracking-tight text-surface-900 dark:text-white sm:text-6xl lg:text-7xl">
          {{ $t('home.hero.titleLine1') }}
          <br />
          <span class="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            {{ $t('home.hero.titleHighlight') }}
          </span>
        </h1>

        <p class="hero-animate hero-delay-2 mt-6 max-w-xl text-base leading-relaxed text-surface-600 dark:text-surface-400 sm:text-lg">
          {{ $t('home.hero.subtitle') }}
        </p>

        <div class="hero-animate hero-delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#positions"
            class="group flex items-center gap-2 rounded-lg bg-surface-900 dark:bg-white px-6 py-3 text-[14px] font-semibold text-white dark:text-[#09090b] no-underline transition hover:bg-surface-800 dark:hover:bg-white/90"
          >
            {{ $t('home.hero.viewRoles') }}
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <NuxtLink
            v-if="session?.user"
            :to="localePath('/dashboard')"
            class="rounded-lg border border-surface-300 dark:border-white/[0.08] bg-surface-100 dark:bg-white/[0.03] px-6 py-3 text-[14px] font-medium text-surface-600 dark:text-surface-300 transition hover:border-surface-400 dark:hover:border-white/[0.14] hover:bg-surface-200 dark:hover:bg-white/[0.06]"
          >
            {{ $t('home.hero.goToDashboard') }}
          </NuxtLink>
        </div>
      </div>

      <!-- ── Why join us ── -->
      <div class="hero-animate hero-delay-4 mx-auto mt-28 grid max-w-3xl gap-4 sm:grid-cols-3">
        <div
          v-for="value in values"
          :key="value.label"
          class="bento-card relative rounded-xl p-6"
        >
          <component :is="value.icon" class="mb-4 h-5 w-5 text-brand-400" />
          <h2 class="text-[15px] font-semibold text-surface-900 dark:text-white">{{ value.label }}</h2>
          <p class="mt-1.5 text-[13px] leading-relaxed text-surface-600 dark:text-surface-400">{{ value.desc }}</p>
        </div>
      </div>

      <!-- ── Open positions ── -->
      <section id="positions" class="hero-animate hero-delay-5 mx-auto mt-28 max-w-3xl scroll-mt-24">
        <div class="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
              {{ $t('home.positions.title') }}
            </h2>
            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {{ $t('home.positions.subtitle') }}
            </p>
          </div>
          <NuxtLink
            v-if="totalJobs > jobs.length"
            :to="localePath('/jobs')"
            class="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:underline sm:inline-flex"
          >
            {{ $t('home.positions.viewAll') }}
            <ArrowRight class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <!-- Loading -->
        <div v-if="jobsStatus === 'pending'" class="py-12 text-center text-sm text-surface-400">
          {{ $t('home.positions.loading') }}
        </div>

        <!-- Empty -->
        <div
          v-else-if="jobs.length === 0"
          class="rounded-xl border border-surface-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-12 text-center"
        >
          <Briefcase class="mx-auto mb-3 size-10 text-surface-300 dark:text-surface-600" />
          <p class="text-sm text-surface-500 dark:text-surface-400">{{ $t('home.positions.empty') }}</p>
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
          <NuxtLink
            v-for="j in jobs"
            :key="j.id"
            :to="localePath(`/jobs/${j.slug}`)"
            class="group block rounded-xl border border-surface-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-5 py-4 no-underline transition-all hover:border-surface-300 dark:hover:border-white/[0.14] hover:shadow-sm"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-surface-900 dark:text-surface-100 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  {{ j.title }}
                </h3>
                <div class="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-surface-500">
                  <span class="inline-flex items-center gap-1">
                    <Briefcase class="size-3.5" />
                    {{ typeLabels[j.type] ?? j.type }}
                  </span>
                  <span v-if="j.location" class="inline-flex items-center gap-1">
                    <MapPin class="size-3.5" />
                    {{ j.location }}
                  </span>
                  <span class="text-surface-400">{{ formatDate(j.createdAt) }}</span>
                </div>
              </div>
              <ChevronRight class="mt-1 size-5 shrink-0 text-surface-300 transition-colors group-hover:text-brand-500" />
            </div>
          </NuxtLink>

          <NuxtLink
            v-if="totalJobs > jobs.length"
            :to="localePath('/jobs')"
            class="flex items-center justify-center gap-1.5 pt-3 text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:underline"
          >
            {{ $t('home.positions.viewAll') }}
            <ArrowRight class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </section>

      <!-- ── Footer ── -->
      <footer class="hero-animate hero-delay-5 mt-28 flex flex-col items-center gap-3 text-center">
        <p class="text-[12px] text-surface-500 dark:text-surface-600">
          {{ $t('home.footer.tagline') }}
        </p>
      </footer>
    </main>
  </div>
</template>
