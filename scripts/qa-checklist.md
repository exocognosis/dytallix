# Dytallix QA & Accessibility Checklist

This document provides a comprehensive checklist for manual and automated quality assurance testing of the Dytallix application.

## Automated Testing

### Cypress E2E Tests
Run the complete E2E test suite to verify core functionality:

````bash
npm run test:e2e
````

#### Test Coverage:
- ✅ **Faucet Flow**: Wallet address input, form submission, success/error handling
- ✅ **Wallet Connect**: Connection simulation and address autofill
- ✅ **Status Polling**: Chain height display and real-time updates
- ✅ **Anomaly Endpoint**: API response validation and structure
- ✅ **Navigation**: Link accessibility and routing verification
- ✅ **Dark Mode**: Theme toggle functionality and persistence

### Accessibility Testing
Automated accessibility checks using axe-core:

````bash
npm run qa
````

- Tests focus on **serious** and **critical** accessibility violations
- Validates ARIA attributes, color contrast, and keyboard navigation
- Runs across all major pages: home, faucet, status, dashboard

### Lighthouse Audits
Performance and accessibility scoring:

````bash
npm run lighthouse
````

**Thresholds:**
- Accessibility Score: ≥ 85%
- Performance Score: ≥ 50% (warning only)
- Best Practices: ≥ 80% (warning only)

## Manual Testing Checklist

### 🚰 Faucet Flow Testing

#### Basic Functionality
- [ ] Navigate to `/faucet` page loads correctly
- [ ] Wallet address input accepts valid bech32 addresses (`dytallix1...`)
- [ ] Form validation rejects invalid addresses
- [ ] Submit button becomes enabled with valid address
- [ ] Success message appears after successful submission
- [ ] Error messages display appropriately for failures

#### Token Selection
- [ ] Dual token option (DGT + DRT) works correctly
- [ ] Single token selection (DGT only, DRT only) functions
- [ ] Token amounts display correctly (2 DGT, 50 DRT)
- [ ] Cooldown timers display and function properly

#### Wallet Integration
- [ ] "Connect Wallet" button appears when no wallet detected
- [ ] Wallet connection attempts are handled gracefully
- [ ] Manual address entry overrides auto-detected addresses
- [ ] Address autofill works when wallet connection succeeds

### 🔗 Wallet Connect & Autofill

#### Connection Flow
- [ ] Wallet connect button is visible and clickable
- [ ] Connection attempts provide user feedback
- [ ] Failed connections don't break the interface
- [ ] Successful connections autofill the address field

#### Address Management
- [ ] Autofilled addresses can be manually edited
- [ ] Address format validation works for all input methods
- [ ] Previously entered addresses persist during session

### 📊 Status & Polling

#### Chain Height Display
- [ ] Navigate to `/status` or `/dashboard`
- [ ] Chain height displays as numeric value > 0
- [ ] Height updates automatically (polling every 10 seconds)
- [ ] Loading states display during data fetching
- [ ] Network errors are handled gracefully

#### Status Information
- [ ] Real-time blockchain data displays correctly
- [ ] Status indicators show current network health
- [ ] API connectivity status is visible

### 🔍 Anomaly Endpoint Testing

#### API Validation
- [ ] GET request to `/anomaly` returns 200 status
- [ ] Response contains required fields: `timestamp`, `anomalies`
- [ ] Timestamp is recent (within last 5 seconds)
- [ ] Anomalies array is present (empty for normal operations)
- [ ] Response time is reasonable (< 2 seconds)

### 🧭 Navigation & Links

#### Navigation Testing
- [ ] All navigation links have correct hrefs
- [ ] Clicking nav links navigates to expected pages
- [ ] No broken links (404 errors)
- [ ] Active page indicators work correctly
- [ ] Back/forward browser navigation functions

#### Link Validation
- [ ] `[data-test="nav-home"]` → `/` (home page)
- [ ] `[data-test="nav-faucet"]` → `/faucet` (faucet page)
- [ ] `[data-test="nav-dashboard"]` → `/dashboard` (status/dashboard)
- [ ] All pages load without errors

### 🌙 Dark Mode Testing

#### Toggle Functionality
- [ ] Dark mode toggle button is visible in navigation
- [ ] Clicking toggle switches between light/dark themes
- [ ] Current mode state persists after page reload
- [ ] Mode preference saves to localStorage

#### Visual Verification
- [ ] Dark mode applies darker color scheme
- [ ] Light mode applies lighter color scheme
- [ ] Text contrast meets accessibility standards (≥4.5:1)
- [ ] Interactive elements remain visible in both modes

#### Cross-Page Consistency
- [ ] Theme persists when navigating between pages
- [ ] Toggle works from any page
- [ ] No visual glitches during theme transitions

### 📱 Mobile & Responsive Testing

#### Viewport Testing
- [ ] Test on mobile viewport (375px width)
- [ ] Navigation remains accessible on small screens
- [ ] Cards and grids stack vertically on mobile
- [ ] No horizontal scrolling occurs
- [ ] Touch targets are appropriately sized (≥44px)

#### Layout Verification
- [ ] Forms remain usable on mobile devices
- [ ] Text remains readable at mobile sizes
- [ ] Interactive elements don't overlap
- [ ] Content fits within viewport bounds

### ♿ Accessibility Manual Checks

#### Keyboard Navigation
- [ ] All interactive elements are focusable with Tab key
- [ ] Focus indicators are clearly visible
- [ ] Keyboard shortcuts work as expected
- [ ] Tab order follows logical sequence

#### Screen Reader Testing
- [ ] Form labels are properly associated with inputs
- [ ] ARIA attributes provide meaningful descriptions
- [ ] Navigation landmarks are properly defined
- [ ] Error messages are announced to screen readers

#### Color & Contrast
- [ ] Text has sufficient contrast in both light/dark modes
- [ ] Color is not the only means of conveying information
- [ ] Focus indicators meet visibility standards
- [ ] Interactive state changes are perceptible

## Exit Criteria

### Automated Tests
- [ ] All Cypress E2E tests pass
- [ ] No serious/critical accessibility violations detected
- [ ] Lighthouse accessibility score ≥ 85%
- [ ] All API endpoints respond correctly

### Manual Verification
- [ ] Faucet flow completes successfully
- [ ] Wallet connection and autofill work
- [ ] Chain height displays and updates
- [ ] Navigation links function correctly
- [ ] Dark mode toggle works and persists
- [ ] Mobile layout is responsive and accessible
- [ ] Keyboard navigation is fully functional

### Performance & Stability
- [ ] Pages load within acceptable timeframes
- [ ] No JavaScript errors in browser console
- [ ] Memory usage remains stable during extended use
- [ ] Network request failures are handled gracefully

## Failure Response

### Critical Issues (Stop Release)
- Faucet cannot submit requests
- Navigation completely broken
- Accessibility violations blocking screen readers
- Application crashes or becomes unresponsive

### Minor Issues (Document & Fix)
- Cosmetic styling issues
- Non-blocking console warnings
- Performance optimizations needed
- Enhancement opportunities identified

## Automation Integration

The checklist items marked with ✅ are automated in the CI/CD pipeline:
- Cypress tests run on every pull request
- Accessibility checks enforce baseline standards
- Lighthouse audits provide performance baselines
- Failed checks block deployment to production

Manual testing should focus on user experience aspects that complement automated coverage.