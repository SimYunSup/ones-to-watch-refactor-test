/**
 * Extract a plain string from a list of rich text items.
 *
 * @see https://developers.notion.com/reference/rich-text
 *
 * @example
 * richTextToPlainText(page.properties.이름.title)
 */
export function richTextToPlainText(data: Array<{ plain_text: string }>): string {
  return data.map((text) => text.plain_text).join("");
}

