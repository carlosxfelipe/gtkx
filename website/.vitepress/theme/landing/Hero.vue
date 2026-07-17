<script setup lang="ts">
import Button from "../components/Button.vue";
import CodeBlock from "../components/CodeBlock.vue";
import Icon from "../components/Icon.vue";
import { REPO_URL } from "./content";

const cmd = "npm create gtkx@rc";

type Tok = { t: string; c?: string };
type Line = { indent?: number; toks: Tok[] };

const code: Line[] = [
    { toks: [{ c: "kw", t: "import" }, { t: " {" }] },
    {
        indent: 1,
        toks: [
            { c: "tag", t: "GtkApplication" },
            { t: ", " },
            { c: "tag", t: "GtkApplicationWindow" },
            { t: ", " },
            { c: "tag", t: "GtkLabel" },
            { t: "," },
        ],
    },
    { toks: [{ t: "} " }, { c: "kw", t: "from" }, { t: " " }, { c: "str", t: '"@gtkx/jsx/gtk"' }, { t: ";" }] },
    {
        toks: [
            { c: "kw", t: "import" },
            { t: " { " },
            { c: "fn", t: "createRoot" },
            { t: " } " },
            { c: "kw", t: "from" },
            { t: " " },
            { c: "str", t: '"@gtkx/react"' },
            { t: ";" },
        ],
    },
    { toks: [] },
    { toks: [{ c: "kw", t: "const" }, { t: " " }, { c: "fn", t: "App" }, { t: " = () => (" }] },
    {
        indent: 1,
        toks: [
            { c: "punct", t: "<" },
            { c: "tag", t: "GtkApplication" },
            { c: "punct", t: ">" },
        ],
    },
    {
        indent: 2,
        toks: [
            { c: "punct", t: "<" },
            { c: "tag", t: "GtkApplicationWindow" },
            { t: " title=" },
            { c: "str", t: '"My App"' },
            { c: "punct", t: ">" },
        ],
    },
    {
        indent: 3,
        toks: [
            { c: "punct", t: "<" },
            { c: "tag", t: "GtkLabel" },
            { c: "punct", t: ">" },
            { t: "Hello from GTKX 👋" },
            { c: "punct", t: "</" },
            { c: "tag", t: "GtkLabel" },
            { c: "punct", t: ">" },
        ],
    },
    {
        indent: 2,
        toks: [
            { c: "punct", t: "</" },
            { c: "tag", t: "GtkApplicationWindow" },
            { c: "punct", t: ">" },
        ],
    },
    {
        indent: 1,
        toks: [
            { c: "punct", t: "</" },
            { c: "tag", t: "GtkApplication" },
            { c: "punct", t: ">" },
        ],
    },
    { toks: [{ t: ");" }] },
    { toks: [] },
    {
        toks: [
            { c: "fn", t: "createRoot" },
            { t: "()." },
            { c: "fn", t: "render" },
            { t: "(" },
            { c: "punct", t: "<" },
            { c: "tag", t: "App" },
            { c: "punct", t: " />" },
            { t: ");" },
        ],
    },
];
</script>

<template>
  <section id="top" class="hero">
    <span class="glow" />
    <div class="hero__grid stack-md">
      <div class="hero__col">
        <p class="overline hero__eyebrow">// React · Linux · GTK4 · Adwaita · TypeScript</p>
        <h1 class="hero__title">
          The React framework for <span class="gtkx-gradient-text">Linux</span>
        </h1>
        <p class="hero__lede">
          Write declarative JSX. GTKX renders it to native
          <strong>GObjects</strong>, powered by a native Rust core,
          with first-class GTK4 &amp; Adwaita support.
        </p>
        <div class="hero__cta">
          <Button size="lg" href="/guide/getting-started">
            Get started
            <template #icon-right><Icon name="arrow" :size="17" /></template>
          </Button>
          <Button size="lg" variant="secondary" :href="REPO_URL">
            <template #icon-left><Icon name="github" /></template>
            View on GitHub
          </Button>
        </div>
      </div>
      <div class="hero__col hero__visual">
        <CodeBlock title="src/index.tsx">
          <div class="hero__code">
            <div v-for="(ln, i) in code" :key="i" class="hcl" :style="{ paddingLeft: `${(ln.indent ?? 0) * 1.3}em` }">
              <span v-if="!ln.toks.length">&nbsp;</span>
              <span v-for="(tk, j) in ln.toks" :key="j" :class="tk.c ? `tok-${tk.c}` : undefined">{{ tk.t }}</span>
            </div>
          </div>
        </CodeBlock>
        <div id="install" class="hero__install">
          <CodeBlock variant="terminal" :frame="false" :code="cmd" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: clamp(3rem, 9vw, 7rem) clamp(1rem, 4vw, 2.5rem) clamp(2rem, 5vw, 4rem);
}
.hero__grid {
  position: relative;
  z-index: 1;
  max-width: var(--container-lg);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: clamp(2rem, 5vw, 4rem);
  align-items: center;
}
.hero__eyebrow {
  margin-bottom: 1.4rem;
  color: var(--text-brand);
}
.hero__title {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(2.4rem, 5.2vw, 4rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  margin: 0;
  color: var(--text-1);
}
.hero__lede {
  font-family: var(--font-body);
  font-size: clamp(1.05rem, 1.6vw, 1.28rem);
  line-height: 1.5;
  color: var(--text-2);
  margin: 1.4rem 0 2rem;
  max-width: 32rem;
}
.hero__lede strong {
  color: var(--text-1);
  font-weight: 600;
}
.hero__cta {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.hero__col {
  min-width: 0;
}
.hero__visual {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.hero__code {
  font-size: var(--text-sm);
  line-height: 1.7;
  white-space: pre;
  width: max-content;
}
.hcl {
  min-height: 1.7em;
}
@media (max-width: 480px) {
  .hero__code {
    font-size: var(--text-xs);
  }
}
</style>
