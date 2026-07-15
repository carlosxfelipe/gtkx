<script setup lang="ts">
import Callout from "../components/Callout.vue";
import CodeBlock from "../components/CodeBlock.vue";

const appCode = `function App() {
  return (
    <AdwApplicationWindow title="Tasks">
      <AdwToolbarView topBar={<AdwHeaderBar />}>
        <GtkLabel>Hello 👋</GtkLabel>
      </AdwToolbarView>
    </AdwApplicationWindow>
  )
}`;
</script>

<template>
  <section id="how" class="how">
    <div class="how__head section-head">
      <p class="overline">From JSX to native, in one render</p>
      <h2 class="section-title">How GTKX works</h2>
    </div>

    <div class="how__step">
      <div class="how__text">
        <span class="how__num">01</span>
        <h3 class="how__name">Write your UI as JSX</h3>
        <p class="how__body">
          Element types are GObject class names, like <code class="l-code">GtkButton</code> or
          <code class="l-code">AdwHeaderBar</code>. Props are their real properties;
          <code class="l-code">on*</code> handlers are their signals. If you know React,
          you already know the API.
        </p>
      </div>
      <CodeBlock title="App.tsx" :code="appCode" />
    </div>

    <div class="how__step how__step--rev">
      <div class="how__text">
        <span class="how__num">02</span>
        <h3 class="how__name">The reconciler maps your tree to live GObjects</h3>
        <p class="how__body">
          A custom react-reconciler turns each element into a real GObject instance and
          keeps it in sync, with no browser engine and no HTML emulating widgets. Your
          component tree <em>is</em> the widget tree.
        </p>
        <Callout type="tip">
          Because every element is a real GObject, even non-widget objects compose as
          JSX: a scale takes its adjustment inline as
          <code class="l-code">adjustment={&lt;GtkAdjustment /&gt;}</code>. If it is a
          GObject, you can write it in JSX.
        </Callout>
      </div>
      <CodeBlock variant="terminal">
        <div class="tdim">App.tsx → react-reconciler</div>
        <div class="tdim">→ GObject instances: GtkButton, AdwHeaderBar</div>
        <div class="tout"><span class="tmark" aria-hidden="true">✓</span> @gtkx/native → libffi → native libraries</div>
      </CodeBlock>
    </div>

    <div class="how__step">
      <div class="how__text">
        <span class="how__num">03</span>
        <h3 class="how__name">Run it with hot reload</h3>
        <p class="how__body">
          <code class="l-code">gtkx dev</code> starts a Vite-based supervisor with Fast Refresh. Edit a
          component and the running native window updates instantly: no restart, no
          lost state.
        </p>
      </div>
      <CodeBlock variant="terminal">
        <div class="tdim">[gtkx] File changed: src/App.tsx</div>
        <div class="tdim">[gtkx] Running Fast Refresh...</div>
        <div class="tout">[gtkx] Fast Refresh complete</div>
      </CodeBlock>
    </div>
  </section>
</template>

<style scoped>
.how {
  max-width: var(--container-lg);
  margin: 0 auto;
  padding: clamp(2.5rem, 5vw, 4.5rem) clamp(1rem, 4vw, 2.5rem);
}
.how__head {
  margin-bottom: clamp(2.5rem, 4vw, 3.5rem);
}
.how__step {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: center;
  margin-bottom: clamp(2rem, 4vw, 3.5rem);
}
.how__step > :deep(*) {
  min-width: 0;
}
.how__step:last-child {
  margin-bottom: 0;
}
.how__step--rev .how__text {
  order: 2;
}
.how__num {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-brand);
  letter-spacing: 0.04em;
}
.how__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-xl);
  letter-spacing: -0.02em;
  margin: 0.5rem 0 0.7rem;
  color: var(--text-1);
}
.how__body {
  font-family: var(--font-body);
  font-size: var(--text-md);
  line-height: 1.6;
  color: var(--text-2);
  margin: 0 0 1.1rem;
}
@media (max-width: 860px) {
  .how__step {
    grid-template-columns: 1fr;
  }
  .how__step--rev .how__text {
    order: 0;
  }
}
</style>
