import { iteratePaginatedAPI, isFullBlock } from "@notionhq/client";
import type { Client } from "@notionhq/client";

async function awaitAll<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}

/**
 * Yield all blocks in a Notion page, recursively.
 *
 * Ported from notion-loader/src/render.ts's `listBlocks`, minus the
 * astro:assets image-caching step. Image blocks are dropped entirely: their
 * Notion `type:"file"` URLs are short-lived signed S3 links (~1h) that break
 * after deploy, and these plain static variants (unlike the origin site's
 * image CDN) can't proxy or rebuild them — so rather than embed an <img>
 * that 404s at runtime, the block is skipped. See index.ts renderPage for
 * the matching cover-image removal.
 */
async function* listBlocks(client: Client, blockId: string): AsyncGenerator<any> {
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) {
      continue;
    }

    // Drop image blocks: no remote <img> in the static output (see above).
    if (block.type === "image") {
      continue;
    }

    if (block.has_children) {
      const children = await awaitAll(listBlocks(client, block.id));
      // @ts-ignore -- indexing a block by its dynamic `type` isn't representable in the SDK's union type
      block[block.type].children = children;
    }

    yield block;
  }
}

export async function collectBlocks(client: Client, pageId: string): Promise<any[]> {
  return awaitAll(listBlocks(client, pageId));
}
