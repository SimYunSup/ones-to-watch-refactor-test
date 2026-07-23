import { iteratePaginatedAPI, isFullBlock } from "@notionhq/client";
import type { Client } from "@notionhq/client";
import { fileToUrl } from "./format.js";

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
 * astro:assets image-caching step: these apps are plain static sites with no
 * Astro asset pipeline, so image blocks are simply pointed at their remote
 * Notion-hosted (or external) URL.
 */
async function* listBlocks(client: Client, blockId: string): AsyncGenerator<any> {
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) {
      continue;
    }

    if (block.has_children) {
      const children = await awaitAll(listBlocks(client, block.id));
      // @ts-ignore -- indexing a block by its dynamic `type` isn't representable in the SDK's union type
      block[block.type].children = children;
    }

    if (block.type === "image") {
      const url = fileToUrl(block.image);
      // notion-rehype-k incorrectly expects "file" to be a string instead of an object
      yield {
        ...block,
        image: {
          type: block.image.type,
          [block.image.type]: url,
          caption: block.image.caption,
        },
      };
    } else {
      yield block;
    }
  }
}

export async function collectBlocks(client: Client, pageId: string): Promise<any[]> {
  return awaitAll(listBlocks(client, pageId));
}
