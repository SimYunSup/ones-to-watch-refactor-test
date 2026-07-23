import type { NewsHeading } from "./types.js";

/**
 * Ported from notion-loader/src/render.ts's `extractTocHeadings`.
 *
 * `rehype-toc`'s `customizeTOC` hook hands back the generated
 * `<nav><ol>…</ol></nav>` tree; walk it into a flat heading list instead of
 * rendering it into the page.
 */
export function extractTocHeadings(toc: any): NewsHeading[] {
  if (toc.tagName !== "nav") {
    throw new Error(`Expected nav, got ${toc.tagName}`);
  }

  function listElementToTree(ol: any, depth: number): NewsHeading[] {
    return ol.children.flatMap((li: any) => {
      const [link, subList] = li.children;
      const currentHeading: NewsHeading = {
        depth,
        text: link.children[0].value,
        slug: link.properties.href.slice(1),
      };

      let headings = [currentHeading];
      if (subList) {
        headings = headings.concat(listElementToTree(subList, depth + 1));
      }
      return headings;
    });
  }

  return listElementToTree(toc.children[0], 0);
}
