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

/**
 * Extract the URL from a Notion file object (page cover, image block, ...).
 *
 * @see https://developers.notion.com/reference/file-object
 */
export function fileToUrl(file: any): string | undefined {
  switch (file?.type) {
    case "external":
      return file.external.url;
    case "file":
      return file.file.url;
    default:
      return undefined;
  }
}
