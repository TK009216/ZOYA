declare global {
  const ZOYA_VERSION: string
  const ZOYA_CHANNEL: string
}

export const InstallationVersion = typeof ZOYA_VERSION === "string" ? ZOYA_VERSION : "local"
export const InstallationChannel = typeof ZOYA_CHANNEL === "string" ? ZOYA_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
