export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const slug = generateSlug(base)
  if (!(await exists(slug))) return slug

  for (let i = 2; i <= 99; i++) {
    const candidate = `${slug}-${i}`
    if (!(await exists(candidate))) return candidate
  }

  return `${slug}-${Date.now()}`
}
