import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
    title: "GTKX",
    tagline: "Build native Linux desktop apps with React and GTK4",
    favicon: "/favicon.svg",

    url: "https://gtkx.dev",
    baseUrl: "/",

    organizationName: "eugeniodepalo",
    projectName: "gtkx",

    onBrokenLinks: "throw",

    markdown: {
        hooks: {
            onBrokenMarkdownLinks: "warn",
        },
    },

    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    editUrl: "https://github.com/eugeniodepalo/gtkx/tree/main/website/",
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        image: "/logo.svg",
        colorMode: {
            defaultMode: "dark",
            disableSwitch: false,
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: "GTKX",
            logo: {
                alt: "GTKX Logo",
                src: "/logo.svg",
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "docs",
                    position: "left",
                    label: "Docs",
                },
                {
                    href: "https://github.com/eugeniodepalo/gtkx",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Introduction",
                            to: "/docs/introduction",
                        },
                        {
                            label: "Getting Started",
                            to: "/docs/getting-started",
                        },
                    ],
                },
                {
                    title: "Community",
                    items: [
                        {
                            label: "GitHub Discussions",
                            href: "https://github.com/eugeniodepalo/gtkx/discussions",
                        },
                        {
                            label: "Issue Tracker",
                            href: "https://github.com/eugeniodepalo/gtkx/issues",
                        },
                    ],
                },
                {
                    title: "More",
                    items: [
                        {
                            label: "GitHub",
                            href: "https://github.com/eugeniodepalo/gtkx",
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Eugenio Depalo. Built with Docusaurus.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ["bash", "json", "yaml", "rust", "ini"],
        },
        docs: {
            sidebar: {
                hideable: true,
                autoCollapseCategories: true,
            },
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
