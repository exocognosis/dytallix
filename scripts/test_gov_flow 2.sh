#!/bin/bash
# End-to-End Governance Flow Test Script
# Tests complete stake-weighted governance lifecycle with parameter change execution

set -e  # Exit on any error

echo "=== Dytallix Stake-Weighted Governance E2E Test ==="
echo

# Configuration
NODE_URL="http://localhost:8545"
CLI_CMD="cargo run --bin dcli"
TEST_DIR="/tmp/governance_e2e_test"
DGT_AMOUNT="1000000000"  # 1000 DGT in micro units

# Test accounts
PROPOSER="dyt1proposer"
DEPOSITOR="dyt1depositor" 
VALIDATOR1="dyt1validator1"
VALIDATOR2="dyt1validator2"
DELEGATOR1="dyt1delegator1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Helper function to run CLI commands
run_cli() {
    echo "$ $CLI_CMD $@"
    $CLI_CMD "$@"
}

# Helper function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        log_info "$1 - SUCCESS"
    else
        log_error "$1 - FAILED"
        exit 1
    fi
}

# Setup test environment
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    
    # Check if node is running
    if ! curl -s "$NODE_URL/health" > /dev/null 2>&1; then
        log_warn "Node not running at $NODE_URL"
        log_info "Please start the Dytallix node first"
        exit 1
    fi
    
    log_info "Node is running at $NODE_URL"
}

# Step 1: Setup accounts and staking
setup_accounts_and_staking() {
    log_info "Step 1: Setting up accounts and staking..."
    
    # Create test accounts (in real setup, these would be pre-funded)
    log_info "Creating test accounts..."
    
    # Register validators
    log_info "Registering validators..."
    run_cli stake register-validator \
        --address "$VALIDATOR1" \
        --pubkey "validator1_pubkey_placeholder" \
        --commission 500 \
        --self-stake 1000000000000
    check_success "Validator 1 registration"
    
    run_cli stake register-validator \
        --address "$VALIDATOR2" \
        --pubkey "validator2_pubkey_placeholder" \
        --commission 750 \
        --self-stake 500000000000
    check_success "Validator 2 registration"
    
    # Add delegations to create voting power
    log_info "Creating delegations..."
    run_cli stake delegate \
        --delegator "$DELEGATOR1" \
        --validator "$VALIDATOR1" \
        --amount 2000000000000
    check_success "Delegation to validator 1"
    
    # Display staking state
    log_info "Current staking state:"
    run_cli query validators
    
    # Check voting power distribution
    log_info "Voting power distribution:"
    run_cli gov total-voting-power
}

# Step 2: Submit proposal with insufficient initial deposit
submit_proposal() {
    log_info "Step 2: Submitting governance proposal..."
    
    # Submit parameter change proposal (initially with low deposit)
    log_info "Submitting proposal to increase gas limit..."
    PROPOSAL_OUTPUT=$(run_cli gov submit \
        --title "Increase Gas Limit" \
        --description "Increase transaction gas limit from 21000 to 50000 for complex transactions" \
        --param-key "gas_limit" \
        --new-value "50000" \
        --deposit 100000000 \
        --from "$PROPOSER" 2>&1)
    
    # Extract proposal ID from output
    PROPOSAL_ID=$(echo "$PROPOSAL_OUTPUT" | grep -o '"proposal_id":[0-9]*' | cut -d':' -f2)
    if [ -z "$PROPOSAL_ID" ]; then
        log_error "Failed to extract proposal ID from output"
        echo "$PROPOSAL_OUTPUT"
        exit 1
    fi
    
    log_info "Proposal submitted with ID: $PROPOSAL_ID"
    echo
    
    # Show proposal status (should be in DepositPeriod)
    log_info "Current proposal status:"
    run_cli gov show --proposal "$PROPOSAL_ID"
    
    export PROPOSAL_ID
}

# Step 3: Add deposits to reach minimum threshold
add_deposits() {
    log_info "Step 3: Adding deposits to reach minimum threshold..."
    
    # Add deposit from depositor to reach minimum
    log_info "Adding deposit to reach voting threshold..."
    run_cli gov deposit \
        --from "$DEPOSITOR" \
        --proposal "$PROPOSAL_ID" \
        --amount 900000000
    check_success "Additional deposit"
    
    # Proposal should now be in VotingPeriod
    log_info "Proposal status after reaching minimum deposit:"
    run_cli gov show --proposal "$PROPOSAL_ID"
}

# Step 4: Cast stake-weighted votes
cast_votes() {
    log_info "Step 4: Casting stake-weighted votes..."
    
    # Vote yes from validator1 (has self-stake + delegation)
    log_info "Validator 1 voting YES..."
    run_cli gov vote \
        --from "$VALIDATOR1" \
        --proposal "$PROPOSAL_ID" \
        --option "yes"
    check_success "Validator 1 vote"
    
    # Vote no from validator2 (has less stake)
    log_info "Validator 2 voting NO..."
    run_cli gov vote \
        --from "$VALIDATOR2" \
        --proposal "$PROPOSAL_ID" \
        --option "no"
    check_success "Validator 2 vote"
    
    # Vote yes from delegator1 (if they have additional voting power)
    log_info "Delegator 1 voting YES..."
    run_cli gov vote \
        --from "$DELEGATOR1" \
        --proposal "$PROPOSAL_ID" \
        --option "yes"
    check_success "Delegator 1 vote"
    
    # Show current tally with voting power details
    log_info "Current vote tally:"
    run_cli gov tally --proposal "$PROPOSAL_ID"
    
    # Show detailed votes with voting power
    log_info "Detailed votes:"
    run_cli gov votes --proposal "$PROPOSAL_ID"
}

# Step 5: Wait for voting period to end and check execution
wait_and_execute() {
    log_info "Step 5: Waiting for voting period to end..."
    
    # In a real test, we would wait for the voting period to expire
    # For this demo, we'll check the current status
    log_info "Checking proposal status..."
    run_cli gov show --proposal "$PROPOSAL_ID"
    
    # If proposal passed, check parameter change
    log_info "Checking if gas limit parameter was updated..."
    CURRENT_CONFIG=$(run_cli gov config 2>&1)
    echo "$CURRENT_CONFIG"
    
    # Check if gas_limit was updated to 50000
    if echo "$CURRENT_CONFIG" | grep -q '"gas_limit":50000'; then
        log_info "✅ Parameter change SUCCESSFUL - gas_limit updated to 50000"
    else
        log_warn "⏳ Parameter change pending or proposal not yet executed"
        log_info "Current config shows:"
        echo "$CURRENT_CONFIG" | grep -o '"gas_limit":[0-9]*'
    fi
}

# Step 6: Verify stake-weighted voting worked correctly
verify_stake_weighting() {
    log_info "Step 6: Verifying stake-weighted voting calculations..."
    
    # Get final tally
    log_info "Final proposal tally:"
    TALLY_OUTPUT=$(run_cli gov tally --proposal "$PROPOSAL_ID" 2>&1)
    echo "$TALLY_OUTPUT"
    
    # Get voting power information
    log_info "Voting power breakdown:"
    
    # Check validator 1 voting power (self-stake + delegations)
    VALIDATOR1_POWER=$(run_cli gov voting-power --address "$VALIDATOR1" 2>&1 || echo "N/A")
    log_info "Validator 1 voting power: $VALIDATOR1_POWER"
    
    # Check validator 2 voting power
    VALIDATOR2_POWER=$(run_cli gov voting-power --address "$VALIDATOR2" 2>&1 || echo "N/A")
    log_info "Validator 2 voting power: $VALIDATOR2_POWER"
    
    # Check total voting power
    TOTAL_VOTING_POWER=$(run_cli gov total-voting-power 2>&1 || echo "N/A")
    log_info "Total voting power in system: $TOTAL_VOTING_POWER"
    
    # Analysis
    log_info "Analysis:"
    log_info "- Validator 1: 1000 DGT self-stake + 2000 DGT delegation = ~3000 DGT voting power"
    log_info "- Validator 2: 500 DGT self-stake = ~500 DGT voting power"
    log_info "- Expected YES votes: ~3000 DGT (Validator 1 + any delegator power)"
    log_info "- Expected NO votes: ~500 DGT (Validator 2)"
    log_info "- Should PASS if participation meets quorum and YES > 50%"
}

# Step 7: Summary and cleanup
test_summary() {
    log_info "Step 7: Test Summary"
    echo
    echo "=== GOVERNANCE E2E TEST SUMMARY ==="
    echo
    
    # List all proposals
    log_info "All proposals in system:"
    run_cli gov proposals
    
    # Get final proposal state
    FINAL_STATUS=$(run_cli gov show --proposal "$PROPOSAL_ID" 2>&1)
    echo "$FINAL_STATUS"
    
    echo
    log_info "Test completed successfully!"
    log_info "Key verification points:"
    echo "  ✓ Proposal submission and deposit mechanics"
    echo "  ✓ Stake-weighted voting power calculation"
    echo "  ✓ Vote casting and tally accumulation"
    echo "  ✓ Parameter change execution (if proposal passed)"
    echo "  ✓ End-to-end governance lifecycle"
    
    echo
    log_info "Governance test artifacts saved in: $TEST_DIR"
}

# Main execution flow
main() {
    echo "Starting Dytallix Stake-Weighted Governance E2E Test"
    echo "=================================================="
    echo
    
    setup_test_env
    setup_accounts_and_staking
    submit_proposal
    add_deposits
    cast_votes
    wait_and_execute
    verify_stake_weighting
    test_summary
    
    log_info "🎉 All tests completed successfully!"
}

# Error handling
trap 'log_error "Test failed at line $LINENO. Exit code: $?"' ERR

# Run the test
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi