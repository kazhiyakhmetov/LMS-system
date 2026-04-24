export function resolveDashboardSection(pathname, sections, fallbackSection) {
  const matchedSection = sections.find(
    (section) => pathname === section.path || pathname.startsWith(`${section.path}/`),
  );

  return matchedSection ?? fallbackSection;
}
