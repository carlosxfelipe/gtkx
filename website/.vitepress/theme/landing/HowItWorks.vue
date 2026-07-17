<script setup lang="ts">
import Callout from "../components/Callout.vue";
import CodeBlock from "../components/CodeBlock.vue";

const appCode = `<AdwToolbarView topBar={<AdwHeaderBar />}>
  <GtkScale
    adjustment={<GtkAdjustment upper={100} />}
    drawValue
  />
</AdwToolbarView>`;

const configCode = `import { defineConfig } from "@gtkx/config";

export default defineConfig({
  libraries: ["Gtk-4.0", "Adw-1", "WebKit-6.0"],
  applicationId: "com.example.myapp",
});`;

const ecosystemCode = `import { animated } from "@gtkx/animated";
import { css } from "@gtkx/css";
import { readFile } from "node:fs/promises";`;
</script>

<template>
  <section id="how" class="how">
    <div class="how__head section-head">
      <p class="overline">JSX to GObject, typed from your system</p>
      <h2 class="section-title">How GTKX works</h2>
    </div>

    <div class="how__step">
      <div class="how__text">
        <span class="how__num">01</span>
        <h3 class="how__name">If it is a GObject, you can write it in JSX</h3>
        <p class="how__body">
          Element types are GObject class names. Props are their properties,
          <code class="l-code">on*</code> handlers are their signals. Nested GObjects go in props,
          so a header bar or an adjustment is an element too, not an object you build on the side.
        </p>
        <Callout type="tip">
          This reaches past widgets. A scale's adjustment prop is typed
          <code class="l-code">Gtk.Adjustment | ReactElement</code>, so the whole GObject graph is
          declarative. Which props take elements is generated, and you can add your own rules
          through <code class="l-code">elementProps</code>.
        </Callout>
      </div>
      <CodeBlock title="src/app.tsx" :code="appCode" lang="tsx" />
    </div>

    <div class="how__step how__step--rev">
      <div class="how__text">
        <span class="how__num">02</span>
        <h3 class="how__name">Codegen binds the libraries you name</h3>
        <p class="how__body">
          Name the GObject-Introspection libraries you want and codegen reads them off your
          system, emitting typed bindings for exactly those namespaces. WebKit, GtkSourceView,
          or your own library bind the same way GTK4 does. Set
          <code class="l-code">"*"</code> to bind the whole installed platform.
        </p>
        <p class="how__body">
          The bindings track your machine: upgrade GTK4 and the changed introspection data
          regenerates them.
        </p>
      </div>
      <CodeBlock title="gtkx.config.ts" :code="configCode" lang="ts" />
    </div>

    <div class="how__step">
      <div class="how__text">
        <span class="how__num">03</span>
        <h3 class="how__name">Typed from introspection, not by hand</h3>
        <p class="how__body">
          Every class, property, signal, and enum comes from the same introspection data GNOME
          ships. Nothing is hand-maintained, so nothing drifts: the types and the metadata the
          reconciler applies at runtime are emitted by one pass. Pass an enum a string and
          <code class="l-code">tsc</code> tells you before the window opens.
        </p>
      </div>
      <CodeBlock variant="terminal">
        <div class="tdim">$ tsc --noEmit</div>
        <div class="terr">src/app.tsx(3,35): error TS2322:</div>
        <div class="terr">Type 'string' is not assignable to</div>
        <div class="terr">type 'Orientation | null | undefined'.</div>
      </CodeBlock>
    </div>

    <div class="how__step how__step--rev">
      <div class="how__text">
        <span class="how__num">04</span>
        <h3 class="how__name">Your app is a Node.js process</h3>
        <p class="how__body">
          So npm works, and so does React. Navigation is React Navigation driving Adwaita pages.
          Animation is Framer Motion. Styling is Emotion. The Node standard library handles files,
          timers, and the network, and the rest of the registry is one install away.
        </p>
      </div>
      <CodeBlock title="src/app.tsx" :code="ecosystemCode" lang="tsx" />
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
