import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Ported from apps/web/src/lib/rehype/convertNotionBookmark.ts.
 *
 * - Promotes each rendered `<h2>`'s Notion block id to a real anchor `id`
 *   (matching the slugs `extractTocHeadings` derives from the TOC).
 * - Rewrites notion-rehype-k's non-standard `<bookmark>` element into a
 *   plain external link.
 */
export default function bookmarkPlugin() {
  return async function (tree: Root) {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "h2") {
        const blockId = node.properties["data-notion-block-id"];
        if (typeof blockId === "string") {
          node.properties.id = blockId;
        }
      }
      if (node.tagName === "bookmark") {
        // notion-rehype-k puts the bookmark URL directly on `properties`
        // as a bare string (not a proper hast Properties object) — read it
        // before it gets overwritten below.
        const href = String(node.properties);
        node.tagName = "a";
        node.properties = {
          href,
          class: "bookmark-link",
          target: "_blank",
          rel: ["noreferrer"],
        };
        node.children = [{ type: "text", value: href }];
      }
    });
  };
}
