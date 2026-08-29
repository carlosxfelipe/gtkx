<script setup lang="ts">
type BundleResult = {
    name: string;
    before: number;
    after: number;
};

type StartupResult = {
    name: string;
    beforeMedian: number;
    beforeQ1: number;
    beforeQ3: number;
    afterMedian: number;
    afterQ1: number;
    afterQ3: number;
};

const WIDTH = 720;
const HEIGHT = 420;
const PLOT_X = 165;
const PLOT_WIDTH = 370;
const ROW_START = 70;
const ROW_HEIGHT = 50;
const BUNDLE_MAX = 12_000_000;
const STARTUP_MAX = 450;

const bundleResults: BundleResult[] = [
    { name: "Animations", before: 5_041_353, after: 1_985_353 },
    { name: "Browser", before: 4_740_170, after: 2_476_305 },
    { name: "GTK Demo", before: 10_647_204, after: 9_522_525 },
    { name: "Hello World", before: 3_811_617, after: 1_855_282 },
    { name: "Navigation", before: 4_337_627, after: 2_270_666 },
    { name: "Tutorial", before: 8_157_518, after: 4_018_935 },
];

const startupResults: StartupResult[] = [
    {
        name: "Animations",
        beforeMedian: 198.1,
        beforeQ1: 195.3,
        beforeQ3: 212.5,
        afterMedian: 196.4,
        afterQ1: 194.4,
        afterQ3: 210.3,
    },
    {
        name: "Browser",
        beforeMedian: 248,
        beforeQ1: 246.2,
        beforeQ3: 269.9,
        afterMedian: 196.5,
        afterQ1: 194.6,
        afterQ3: 211.2,
    },
    {
        name: "GTK Demo",
        beforeMedian: 356.3,
        beforeQ1: 309,
        beforeQ3: 400.8,
        afterMedian: 337.3,
        afterQ1: 293.7,
        afterQ3: 388,
    },
    {
        name: "Hello World",
        beforeMedian: 200.8,
        beforeQ1: 192.3,
        beforeQ3: 207.4,
        afterMedian: 140.6,
        afterQ1: 137.3,
        afterQ3: 148.7,
    },
    {
        name: "Navigation",
        beforeMedian: 240.8,
        beforeQ1: 230.1,
        beforeQ3: 258.3,
        afterMedian: 180.3,
        afterQ1: 173.2,
        afterQ3: 191.6,
    },
    {
        name: "Tutorial",
        beforeMedian: 286,
        beforeQ1: 233.6,
        beforeQ3: 299.6,
        afterMedian: 222.7,
        afterQ1: 191.7,
        afterQ3: 235.5,
    },
];

const bundleTicks = [0, 3_000_000, 6_000_000, 9_000_000, 12_000_000];
const startupTicks = [0, 100, 200, 300, 400];
const rowY = (index: number): number => ROW_START + index * ROW_HEIGHT;
const bundleX = (value: number): number => PLOT_X + (value / BUNDLE_MAX) * PLOT_WIDTH;
const startupX = (value: number): number => PLOT_X + (value / STARTUP_MAX) * PLOT_WIDTH;
const formatBundle = (value: number): string => (value / 1_000_000).toFixed(2) + " MB";
const formatStartup = (value: number): string => value.toFixed(1) + " ms";
const formatBundleTick = (value: number): string => String(value / 1_000_000);
const formatStartupTick = (value: number): string => String(value);

const changePercent = (before: number, after: number): number => ((after - before) / before) * 100;

const formatChange = (before: number, after: number): string => {
    const change = changePercent(before, after);
    const sign = change < 0 ? "−" : "+";

    return sign + Math.abs(change).toFixed(1) + "%";
};

const formatReduction = (before: number, after: number): string =>
    Math.abs(changePercent(before, after)).toFixed(1) + "%";

const formatRange = (median: number, q1: number, q3: number): string =>
    formatStartup(median) + " (" + q1.toFixed(1) + "–" + q3.toFixed(1) + ")";
</script>

<template>
  <div class="benchmarks">
    <figure class="benchmark">
      <div class="chart-shell" tabindex="0" aria-label="Scrollable production bundle size comparison chart">
        <svg
          class="chart"
          :viewBox="'0 0 ' + WIDTH + ' ' + HEIGHT"
          role="img"
          aria-labelledby="bundle-benchmark-title bundle-benchmark-description"
        >
          <title id="bundle-benchmark-title">Production JavaScript bundle size with tree shaking off and on</title>
          <desc id="bundle-benchmark-description">
            All six GTKX examples produce smaller bundles with tree shaking enabled. Exact values appear in the
            table below.
          </desc>
          <text class="chart-title" x="24" y="28">Production JavaScript bundle</text>
          <text class="chart-subtitle" x="24" y="49">Smaller is better · minified bundle.mjs</text>
          <g v-for="tick in bundleTicks" :key="tick">
            <line class="chart-grid" :x1="bundleX(tick)" :x2="bundleX(tick)" y1="62" y2="372" />
            <text class="chart-tick" :x="bundleX(tick)" y="397" text-anchor="middle">
              {{ formatBundleTick(tick) }}
            </text>
          </g>
          <text class="chart-tick chart-unit" :x="bundleX(BUNDLE_MAX)" y="414" text-anchor="end">MB</text>
          <g v-for="(row, index) in bundleResults" :key="row.name">
            <text class="chart-name" x="24" :y="rowY(index) + 25">{{ row.name }}</text>
            <text class="chart-series" x="126" :y="rowY(index) + 16">Off</text>
            <text class="chart-series" x="126" :y="rowY(index) + 39">On</text>
            <rect
              class="chart-bar chart-bar-before"
              :x="PLOT_X"
              :y="rowY(index) + 4"
              :width="bundleX(row.before) - PLOT_X"
              height="14"
              rx="5"
            />
            <rect
              class="chart-bar chart-bar-after"
              :x="PLOT_X"
              :y="rowY(index) + 27"
              :width="bundleX(row.after) - PLOT_X"
              height="14"
              rx="5"
            />
            <text class="chart-value" x="545" :y="rowY(index) + 16">{{ formatBundle(row.before) }}</text>
            <text class="chart-value chart-value-after" x="545" :y="rowY(index) + 39">
              {{ formatBundle(row.after) }} · {{ formatChange(row.before, row.after) }}
            </text>
          </g>
        </svg>
      </div>
      <figcaption>Both builds use the same GTKX 1.6 source; only <code>v2TreeShaking</code> changes.</figcaption>
    </figure>

    <div
      class="table-shell"
      role="region"
      tabindex="0"
      aria-label="Scrollable production bundle measurements table"
    >
      <table>
        <caption>Production bundle measurements</caption>
        <thead>
          <tr>
            <th scope="col">Example</th>
            <th scope="col">Flag off</th>
            <th scope="col">Flag on</th>
            <th scope="col">Reduction</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in bundleResults" :key="row.name">
            <th scope="row">{{ row.name }}</th>
            <td>{{ formatBundle(row.before) }}</td>
            <td>{{ formatBundle(row.after) }}</td>
            <td class="table-change">{{ formatReduction(row.before, row.after) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <figure class="benchmark">
      <div class="chart-shell" tabindex="0" aria-label="Scrollable fresh-process startup comparison chart">
        <svg
          class="chart"
          :viewBox="'0 0 ' + WIDTH + ' ' + HEIGHT"
          role="img"
          aria-labelledby="startup-benchmark-title startup-benchmark-description"
        >
          <title id="startup-benchmark-title">Fresh-process startup time with tree shaking off and on</title>
          <desc id="startup-benchmark-description">
            Bars show median time from process spawn to the first mapped application window. Whiskers show the
            interquartile range. Exact values appear in the table below.
          </desc>
          <text class="chart-title" x="24" y="28">Fresh-process startup</text>
          <text class="chart-subtitle" x="24" y="49">Smaller is better · median with interquartile range</text>
          <g v-for="tick in startupTicks" :key="tick">
            <line class="chart-grid" :x1="startupX(tick)" :x2="startupX(tick)" y1="62" y2="372" />
            <text class="chart-tick" :x="startupX(tick)" y="397" text-anchor="middle">
              {{ formatStartupTick(tick) }}
            </text>
          </g>
          <text class="chart-tick chart-unit" :x="startupX(STARTUP_MAX)" y="414" text-anchor="end">ms</text>
          <g v-for="(row, index) in startupResults" :key="row.name">
            <text class="chart-name" x="24" :y="rowY(index) + 25">{{ row.name }}</text>
            <text class="chart-series" x="126" :y="rowY(index) + 16">Off</text>
            <text class="chart-series" x="126" :y="rowY(index) + 39">On</text>
            <rect
              class="chart-bar chart-bar-before"
              :x="PLOT_X"
              :y="rowY(index) + 4"
              :width="startupX(row.beforeMedian) - PLOT_X"
              height="14"
              rx="5"
            />
            <rect
              class="chart-bar chart-bar-after"
              :x="PLOT_X"
              :y="rowY(index) + 27"
              :width="startupX(row.afterMedian) - PLOT_X"
              height="14"
              rx="5"
            />
            <line
              class="chart-whisker chart-whisker-before"
              :x1="startupX(row.beforeQ1)"
              :x2="startupX(row.beforeQ3)"
              :y1="rowY(index) + 11"
              :y2="rowY(index) + 11"
            />
            <line
              class="chart-whisker chart-whisker-before"
              :x1="startupX(row.beforeQ1)"
              :x2="startupX(row.beforeQ1)"
              :y1="rowY(index) + 7"
              :y2="rowY(index) + 15"
            />
            <line
              class="chart-whisker chart-whisker-before"
              :x1="startupX(row.beforeQ3)"
              :x2="startupX(row.beforeQ3)"
              :y1="rowY(index) + 7"
              :y2="rowY(index) + 15"
            />
            <line
              class="chart-whisker chart-whisker-after"
              :x1="startupX(row.afterQ1)"
              :x2="startupX(row.afterQ3)"
              :y1="rowY(index) + 34"
              :y2="rowY(index) + 34"
            />
            <line
              class="chart-whisker chart-whisker-after"
              :x1="startupX(row.afterQ1)"
              :x2="startupX(row.afterQ1)"
              :y1="rowY(index) + 30"
              :y2="rowY(index) + 38"
            />
            <line
              class="chart-whisker chart-whisker-after"
              :x1="startupX(row.afterQ3)"
              :x2="startupX(row.afterQ3)"
              :y1="rowY(index) + 30"
              :y2="rowY(index) + 38"
            />
            <text class="chart-value" x="545" :y="rowY(index) + 16">{{ formatStartup(row.beforeMedian) }}</text>
            <text class="chart-value chart-value-after" x="545" :y="rowY(index) + 39">
              {{ formatStartup(row.afterMedian) }} ·
              {{ formatChange(row.beforeMedian, row.afterMedian) }}
            </text>
          </g>
        </svg>
      </div>
      <figcaption>
        Bars are medians across 30 launches per variant; whiskers show the interquartile range.
      </figcaption>
    </figure>

    <div
      class="table-shell"
      role="region"
      tabindex="0"
      aria-label="Scrollable fresh-process startup measurements table"
    >
      <table>
        <caption>Fresh-process startup measurements</caption>
        <thead>
          <tr>
            <th scope="col">Example</th>
            <th scope="col">Flag off, median (IQR)</th>
            <th scope="col">Flag on, median (IQR)</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in startupResults" :key="row.name">
            <th scope="row">{{ row.name }}</th>
            <td>{{ formatRange(row.beforeMedian, row.beforeQ1, row.beforeQ3) }}</td>
            <td>{{ formatRange(row.afterMedian, row.afterQ1, row.afterQ3) }}</td>
            <td class="table-change">{{ formatChange(row.beforeMedian, row.afterMedian) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.benchmarks {
  display: grid;
  gap: var(--space-5);
  margin: var(--space-6) 0;
}

.benchmark {
  margin: 0;
}

.chart-shell {
  overflow-x: auto;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.chart-shell:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 3px;
}

.chart {
  display: block;
  width: 100%;
  min-width: 640px;
  height: auto;
  font-family: var(--font-body);
  font-variant-numeric: tabular-nums;
}

.chart-title {
  fill: var(--text-1);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: var(--fw-bold);
}

.chart-subtitle,
.chart-series,
.chart-tick {
  fill: var(--text-2);
  font-size: 12px;
}

.chart-name {
  fill: var(--text-1);
  font-size: 14px;
  font-weight: var(--fw-semibold);
}

.chart-grid {
  stroke: var(--border);
  stroke-width: 1;
}

.chart-bar-before {
  fill: var(--bg-elevated);
  stroke: var(--text-2);
  stroke-dasharray: 4 3;
  stroke-width: 1.5;
}

.chart-bar-after {
  fill: var(--brand);
}

.chart-whisker {
  stroke-linecap: round;
  stroke-width: 1.5;
}

.chart-whisker-before {
  stroke: var(--text-1);
}

.chart-whisker-after {
  stroke: var(--brand-contrast);
}

.chart-value {
  fill: var(--text-2);
  font-size: 11px;
}

.chart-value-after {
  fill: var(--text-1);
  font-weight: var(--fw-semibold);
}

.chart-unit {
  font-weight: var(--fw-semibold);
}

figcaption {
  margin: var(--space-2) var(--space-2) 0;
  color: var(--text-2);
  font-size: var(--text-sm);
  font-style: italic;
}

.table-shell {
  overflow-x: auto;
}

.table-shell:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 3px;
}

table {
  width: 100%;
  margin: 0;
  border-collapse: collapse;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

caption {
  margin-bottom: var(--space-2);
  color: var(--text-1);
  font-weight: var(--fw-semibold);
  text-align: left;
}

th,
td {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  text-align: right;
  white-space: nowrap;
}

th:first-child,
td:first-child {
  text-align: left;
}

thead {
  background: var(--bg-soft);
}

.table-change {
  color: var(--text-1);
  font-weight: var(--fw-semibold);
}

@media (max-width: 640px) {
  .benchmarks {
    margin-inline: calc(var(--gutter) * -1);
  }

  .table-shell {
    padding-inline: var(--gutter);
  }

  figcaption {
    margin-inline: var(--gutter);
  }
}
</style>
