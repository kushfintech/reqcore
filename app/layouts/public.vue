<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <!-- Simple header -->
    <header class="border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <NuxtLink :to="localePath('/')" class="text-lg font-bold text-surface-900 dark:text-surface-100 no-underline">
          Kush Talents
        </NuxtLink>
        <LanguageSwitcher />
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-surface-200 dark:border-surface-800 mt-12">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <p class="text-xs text-surface-400 text-center">
          {{ $t('home.footer.tagline') }}
        </p>
      </div>
    </footer>
  </div>
</template>
