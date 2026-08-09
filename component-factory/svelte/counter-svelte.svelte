<svelte:options customElement={{ tag: "s2-counter-svelte", shadow: "none" }} />

<script>
  // Authored in Svelte 5 RUNES mode (the build compiles with runes: true,
  // so legacy Svelte-4 store syntax is a compile error, not a fallback).
  // The nanostores atom binds explicitly: $state holds the local mirror,
  // $effect subscribes — its returned unsubscriber is the teardown.
  import { $counter as counter } from "#stores";

  let count = $state(counter.get());
  $effect(() => counter.subscribe((value) => { count = value; }));
</script>

<div class="s2-row">
  <wa-button size="s" appearance="outlined" onclick={() => counter.set(count - 1)}>−</wa-button>
  <strong class="s2-price">{count}</strong>
  <wa-button size="s" appearance="outlined" onclick={() => counter.set(count + 1)}>+</wa-button>
  <span class="s2-quiet s2-small">svelte (compiled artifact, runes)</span>
</div>
