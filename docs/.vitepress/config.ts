import { defineConfig } from "vitepress";
import { transformerTwoslash } from "@shikijs/vitepress-twoslash";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "htim",
    description: "HTML immediate mode.",
    markdown: {
        codeTransformers: [transformerTwoslash() as any],
        languages: ["js", "jsx", "ts", "tsx"] as any,
    },
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: "Home", link: "/" },
        ],

        sidebar: [
            { text: "Hello", link: "/hello" },
        ],

        socialLinks: [
            { icon: "github", link: "https://github.com/AWeirdDev/htim" },
            { icon: "npm", link: "https://npmjs.com/package/@aweirddev/htim" },
        ],
    },
});
