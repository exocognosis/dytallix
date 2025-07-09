#!/bin/bash

# Comprehensive Compilation Issues Scanner for Dytallix
# This script scans all code areas for compilation errors, warnings, and issues

echo "🔍 Dytallix Comprehensive Code Analysis"
echo "========================================"
echo "📍 Working directory: $(pwd)"
echo "📅 Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Ensure we're in the right directory
if [ ! -f "WASM.md" ]; then
    echo "❌ Error: Not in Dytallix root directory"
    echo "Please run this script from the root of the Dytallix project"
    exit 1
fi

print_status $BLUE "📋 Phase 1: Crate-by-Crate Analysis"
echo "=================================="

# Array of crates to check
crates=("blockchain-core" "smart-contracts" "pqc-crypto" "developer-tools" "governance")

total_warnings=0
total_errors=0

for crate in "${crates[@]}"; do
    print_status $YELLOW "🔍 Checking crate: $crate"
    
    if [ -d "$crate" ] && [ -f "$crate/Cargo.toml" ]; then
        cd "$crate"
        
        # Check compilation
        cargo_output=$(cargo check 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            print_status $GREEN "  ✅ Compiles successfully"
        else
            print_status $RED "  ❌ Compilation failed"
            total_errors=$((total_errors + 1))
        fi
        
        # Count warnings
        warning_count=$(echo "$cargo_output" | grep -c "warning:")
        if [ $warning_count -gt 0 ]; then
            print_status $YELLOW "  ⚠️  $warning_count warnings"
            total_warnings=$((total_warnings + warning_count))
        else
            print_status $GREEN "  ✅ No warnings"
        fi
        
        # Check for specific issue types
        dead_code=$(echo "$cargo_output" | grep -c "never used\|never read")
        unused_imports=$(echo "$cargo_output" | grep -c "unused import")
        unused_variables=$(echo "$cargo_output" | grep -c "unused variable")
        
        if [ $dead_code -gt 0 ]; then
            echo "    • Dead code issues: $dead_code"
        fi
        if [ $unused_imports -gt 0 ]; then
            echo "    • Unused imports: $unused_imports"
        fi
        if [ $unused_variables -gt 0 ]; then
            echo "    • Unused variables: $unused_variables"
        fi
        
        cd ..
    else
        print_status $RED "  ❌ No Cargo.toml found"
    fi
    echo ""
done

print_status $BLUE "📋 Phase 2: Standalone File Analysis"
echo "===================================="

# Check standalone Rust files
standalone_files=$(find . -maxdepth 1 -name "*.rs" -type f)

if [ -n "$standalone_files" ]; then
    for file in $standalone_files; do
        print_status $YELLOW "🔍 Checking standalone file: $file"
        
        # Try to compile as a standalone binary
        rustc_output=$(rustc --edition=2021 --check "$file" 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            print_status $GREEN "  ✅ Compiles successfully"
        else
            print_status $RED "  ❌ Compilation failed"
            total_errors=$((total_errors + 1))
            echo "    Errors:"
            echo "$rustc_output" | head -5 | sed 's/^/    /'
        fi
        echo ""
    done
else
    print_status $GREEN "  ✅ No standalone Rust files found"
fi

print_status $BLUE "📋 Phase 3: Module Integration Analysis"
echo "======================================"

# Check modules that should be crates but aren't
modules_to_check=("security" "interoperability" "wallet")

for module in "${modules_to_check[@]}"; do
    print_status $YELLOW "🔍 Checking module: $module"
    
    if [ -d "$module/src" ]; then
        if [ -f "$module/Cargo.toml" ]; then
            print_status $GREEN "  ✅ Has Cargo.toml"
            cd "$module"
            cargo_output=$(cargo check 2>&1)
            exit_code=$?
            
            if [ $exit_code -eq 0 ]; then
                print_status $GREEN "  ✅ Compiles successfully"
            else
                print_status $RED "  ❌ Compilation failed"
                total_errors=$((total_errors + 1))
            fi
            cd ..
        else
            print_status $RED "  ❌ Missing Cargo.toml"
            total_errors=$((total_errors + 1))
        fi
        
        # Check for TODO comments
        todo_count=$(find "$module" -name "*.rs" -exec grep -c "TODO\|FIXME\|XXX" {} \; 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
        if [ $todo_count -gt 0 ]; then
            print_status $YELLOW "  ⚠️  $todo_count TODO/FIXME comments"
        fi
        
        # Check for dummy implementations
        dummy_count=$(find "$module" -name "*.rs" -exec grep -c "Dummy\|dummy\|unimplemented!\|todo!" {} \; 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
        if [ $dummy_count -gt 0 ]; then
            print_status $YELLOW "  ⚠️  $dummy_count dummy implementations"
        fi
    else
        print_status $RED "  ❌ No src directory found"
    fi
    echo ""
done

print_status $BLUE "📋 Phase 4: Test Infrastructure Analysis"
echo "======================================="

# Check test compilation
for crate in "${crates[@]}"; do
    if [ -d "$crate" ] && [ -f "$crate/Cargo.toml" ]; then
        print_status $YELLOW "🔍 Checking tests in: $crate"
        cd "$crate"
        
        # Check if tests compile
        test_output=$(cargo test --no-run 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            print_status $GREEN "  ✅ Tests compile successfully"
        else
            print_status $RED "  ❌ Test compilation failed"
            total_errors=$((total_errors + 1))
        fi
        
        # Count test files
        test_count=$(find . -name "*test*.rs" -o -name "tests/*.rs" | wc -l)
        echo "    • Test files found: $test_count"
        
        cd ..
    fi
done

print_status $BLUE "📋 Phase 5: Dependency Analysis"
echo "==============================="

# Check for missing dependencies
print_status $YELLOW "🔍 Checking for missing dependencies"

# Common missing dependencies
missing_deps=0

# Check for external crate usage without proper declaration
external_crates=$(grep -r "use.*::" --include="*.rs" . | grep -v "crate::" | grep -v "std::" | grep -v "super::" | cut -d':' -f3 | cut -d' ' -f2 | sort | uniq | head -10)

if [ -n "$external_crates" ]; then
    print_status $YELLOW "  ⚠️  External crates found in use statements:"
    echo "$external_crates" | while read -r crate; do
        if [[ "$crate" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
            echo "    • $crate"
        fi
    done
fi

print_status $BLUE "📋 Phase 6: Code Quality Analysis"
echo "================================="

# Check for code quality issues
print_status $YELLOW "🔍 Analyzing code quality"

# Count TODO comments across all files
total_todos=$(find . -name "*.rs" -exec grep -c "TODO\|FIXME\|XXX" {} \; 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
print_status $YELLOW "  ⚠️  Total TODO/FIXME comments: $total_todos"

# Count panic! and unwrap() usage
panic_count=$(find . -name "*.rs" -exec grep -c "panic!\|\.unwrap()" {} \; 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
if [ $panic_count -gt 0 ]; then
    print_status $YELLOW "  ⚠️  panic!/unwrap() usage: $panic_count"
fi

# Count unsafe blocks
unsafe_count=$(find . -name "*.rs" -exec grep -c "unsafe " {} \; 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
if [ $unsafe_count -gt 0 ]; then
    print_status $YELLOW "  ⚠️  unsafe blocks: $unsafe_count"
fi

print_status $BLUE "📊 Final Summary"
echo "================"

echo "📈 Statistics:"
echo "  • Total warnings: $total_warnings"
echo "  • Total errors: $total_errors"
echo "  • TODO comments: $total_todos"
echo "  • Crates checked: ${#crates[@]}"
echo "  • Modules checked: ${#modules_to_check[@]}"

echo ""
echo "🎯 Priority Actions:"
if [ $total_errors -gt 0 ]; then
    print_status $RED "  1. Fix $total_errors compilation errors (HIGH PRIORITY)"
fi
if [ $total_warnings -gt 50 ]; then
    print_status $YELLOW "  2. Address $total_warnings warnings (MEDIUM PRIORITY)"
fi
if [ $total_todos -gt 20 ]; then
    print_status $YELLOW "  3. Review $total_todos TODO comments (LOW PRIORITY)"
fi

echo ""
echo "📚 Generated Reports:"
echo "  • See COMPILATION_WARNINGS_TRACKING.md for detailed analysis"
echo "  • See MANUAL_CLEANUP_TASKS.md for specific fix instructions"
echo "  • Run ./cleanup_warnings.sh for automated fixes"

echo ""
if [ $total_errors -eq 0 ]; then
    print_status $GREEN "🎉 No compilation errors found! Core functionality is working."
else
    print_status $RED "❌ $total_errors compilation errors need attention."
fi

echo ""
print_status $BLUE "🔧 Recommended next steps:"
echo "  1. Run automated cleanup: ./cleanup_warnings.sh"
echo "  2. Review and fix compilation errors manually"
echo "  3. Convert incomplete modules to proper crates"
echo "  4. Update documentation and tests"
echo "  5. Set up CI/CD to prevent future issues"

exit $total_errors
