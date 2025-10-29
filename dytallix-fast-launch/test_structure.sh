#!/bin/bash
echo "=== Testing Dytallix Fast Launch Web Structure ==="
echo ""

# Check directory structure
echo "1. Directory Structure:"
for dir in homepage build quantumshield shared-assets; do
  if [ -d "$dir" ]; then
    echo "  ✓ /$dir exists"
  else
    echo "  ✗ /$dir missing"
  fi
done
echo ""

# Check shared assets
echo "2. Shared Assets:"
for file in styles.css app.js constants.js logo.svg header.html footer.html; do
  if [ -f "shared-assets/$file" ]; then
    echo "  ✓ shared-assets/$file"
  else
    echo "  ✗ shared-assets/$file missing"
  fi
done
echo ""

# Check homepage
echo "3. Homepage:"
if [ -f "homepage/index.html" ]; then
  echo "  ✓ homepage/index.html"
else
  echo "  ✗ homepage/index.html missing"
fi
echo ""

# Check build pages
echo "4. Build Pages:"
for page in index pqc-wallet faucet explorer dashboard tokenomics docs; do
  if [ -f "build/$page.html" ]; then
    echo "  ✓ build/$page.html"
  else
    echo "  ✗ build/$page.html missing"
  fi
done
echo ""

# Check quantumshield
echo "5. QuantumShield:"
if [ -f "quantumshield/index.html" ]; then
  echo "  ✓ quantumshield/index.html"
else
  echo "  ✗ quantumshield/index.html missing"
fi
echo ""

# Validate HTML structure
echo "6. HTML Validation (basic):"
for html_file in homepage/index.html build/index.html quantumshield/index.html; do
  if grep -q "<!DOCTYPE html>" "$html_file" && \
     grep -q "</html>" "$html_file" && \
     grep -q "<head>" "$html_file" && \
     grep -q "</body>" "$html_file"; then
    echo "  ✓ $html_file has valid structure"
  else
    echo "  ✗ $html_file has invalid structure"
  fi
done
echo ""

# Check navigation links
echo "7. Navigation Links (sample):"
if grep -q 'href="../build/index.html"' homepage/index.html; then
  echo "  ✓ Homepage links to Build"
fi
if grep -q 'href="../quantumshield/index.html"' homepage/index.html; then
  echo "  ✓ Homepage links to QuantumShield"
fi
if grep -q 'href="../shared-assets/styles.css"' homepage/index.html; then
  echo "  ✓ Homepage includes shared styles"
fi
echo ""

echo "=== Test Complete ==="
