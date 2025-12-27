import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
    docs: [
        {
            type: "category",
            label: "Getting Started",
            collapsed: false,
            items: ["introduction", "getting-started", "cli"],
        },
        {
            type: "category",
            label: "Core Concepts",
            items: ["styling", "async-operations", "error-handling"],
        },
        {
            type: "category",
            label: "Components",
            items: ["adwaita", "lists", "menus", "slots", "portals"],
        },
        {
            type: "category",
            label: "Testing & Deployment",
            items: ["testing", "deploying"],
        },
    ],
};

export default sidebars;
