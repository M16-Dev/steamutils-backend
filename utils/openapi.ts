/**
 * Strips "Public" tag from OpenAPI specification paths.
 * @param spec - OpenAPI specification.
 * @returns OpenAPI specification with "Public" tag removed from paths.
 */
export function stripPublicTag(spec: Record<string, unknown>): Record<string, unknown> {
  const paths = spec.paths as Record<string, Record<string, { tags?: string[] }>> | undefined;
  if (!paths) return spec;

  const newPaths: Record<string, unknown> = {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const newPathItem: Record<string, unknown> = {};

    for (const [method, operation] of Object.entries(pathItem)) {
      if (operation?.tags?.includes("Public")) {
        const filteredTags = operation.tags.filter((t) => t !== "Public");
        newPathItem[method] = { ...operation, tags: filteredTags };
      } else {
        newPathItem[method] = operation;
      }
    }

    newPaths[path] = newPathItem;
  }

  return { ...spec, paths: newPaths };
}

/**
 * Filters out paths with "Public" tag from OpenAPI specification.
 * @param spec - OpenAPI specification.
 * @returns OpenAPI specification without "Public" tagged paths.
 */
export function filterPublicPaths(spec: Record<string, unknown>): Record<string, unknown> {
  const paths = spec.paths as Record<string, Record<string, { tags?: string[] }>> | undefined;
  if (!paths) return spec;

  const filteredPaths: Record<string, unknown> = {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const filteredPathItem: Record<string, unknown> = {};

    for (const [method, operation] of Object.entries(pathItem)) {
      if (operation?.tags?.includes("Public")) {
        const filteredTags = operation.tags.filter((t) => t !== "Public");
        filteredPathItem[method] = { ...operation, tags: filteredTags };
      }
    }

    filteredPaths[path] = filteredPathItem;
  }

  return { ...spec, paths: filteredPaths };
}
