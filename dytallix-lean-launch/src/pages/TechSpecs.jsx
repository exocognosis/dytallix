import React from 'react'
import TechStack from './TechStack.jsx'

// Deprecated: TechSpecs has been renamed to TechStack.
// This wrapper keeps backward compatibility for any legacy imports/routes.
// TechStack already uses single-line subtitle via .nowrap utility.

export default function TechSpecs() {
  return <TechStack />
}