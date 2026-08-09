<template>
  <div class="s2-row">
    <wa-button size="s" appearance="outlined" @click="dec">−</wa-button>
    <strong class="s2-price">{{ count }}</strong>
    <wa-button size="s" appearance="outlined" @click="inc">+</wa-button>
    <span class="s2-quiet s2-small">vue (compiled artifact)</span>
  </div>
</template>

<script>
// Authored as a Vue SFC (options API — the factory compiles the template
// to a render function, no runtime compiler in the artifact). The atom is
// the site's shared #stores instance.
import { $counter } from "#stores";

export default {
  data: () => ({ count: $counter.get() }),
  mounted() {
    this.unsub = $counter.subscribe((value) => {
      this.count = value;
    });
  },
  unmounted() {
    this.unsub?.();
  },
  methods: {
    inc() {
      $counter.set(this.count + 1);
    },
    dec() {
      $counter.set(this.count - 1);
    },
  },
};
</script>
