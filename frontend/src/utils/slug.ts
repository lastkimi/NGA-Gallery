// 生成 SEO 友好的 Slug
// 格式: title-attribution-id
// 示例: vincent-van-gogh-the-starry-night-12345

export function generateSlug(title: string, attribution: string | undefined, id: string | number): string {
  const cleanText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除非字母数字字符
      .replace(/\s+/g, '-')     // 空格转连字符
      .replace(/-+/g, '-')      // 合并连字符
      .trim();
  };

  const titleSlug = cleanText(title || 'untitled');
  // 如果 attribution 存在且不是 "Unknown"，则加入 slug
  const attrSlug = attribution && attribution.toLowerCase() !== 'unknown' 
    ? cleanText(attribution) 
    : '';

  const combinedSlug = attrSlug ? `${attrSlug}-${titleSlug}` : titleSlug;
  
  // 限制 slug 长度，防止 URL 过长
  const truncatedSlug = combinedSlug.length > 80 
    ? combinedSlug.substring(0, 80).replace(/-$/, '') 
    : combinedSlug;

  return `${truncatedSlug}-${id}`;
}

// 从 Slug 中提取 ID
// 假设 ID 是 URL 的最后一部分
export function getIdFromSlug(slug: string): string {
  const parts = slug.split('-');
  return parts[parts.length - 1];
}
