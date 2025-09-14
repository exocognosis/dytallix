// Feature flags for style system rollback safety
export const USE_HOME_STYLE = process.env.REACT_APP_USE_HOME_STYLE !== 'false'

// Add more feature flags as needed
export const ENABLE_ANIMATIONS = process.env.REACT_APP_ENABLE_ANIMATIONS !== 'false'
export const ENABLE_BLUR_EFFECTS = process.env.REACT_APP_ENABLE_BLUR_EFFECTS !== 'false'

export const featureFlags = {
  USE_HOME_STYLE,
  ENABLE_ANIMATIONS,
  ENABLE_BLUR_EFFECTS
}

export default featureFlags