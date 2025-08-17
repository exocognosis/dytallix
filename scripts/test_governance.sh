#!/bin/bash

# Dytallix Governance Integration Test
# This script demonstrates the complete governance flow

set -e

echo "🗳️  Dytallix Governance Integration Test"
echo "======================================="

# Configuration
NODE_URL="http://localhost:3030"
PROPOSER="dyt1proposer123"
DEPOSITOR="dyt1depositor456"
VOTER1="dyt1voter789"
VOTER2="dyt1voter012"

# Function to check if node is running
check_node() {
    echo "📡 Checking if node is running..."
    curl -s "$NODE_URL/stats" > /dev/null || {
        echo "❌ Node is not running at $NODE_URL"
        echo "Please start the dytallix-lean-node first"
        exit 1
    }
    echo "✅ Node is running"
}

# Function to submit proposal
submit_proposal() {
    echo "📝 Submitting governance proposal..."
    
    PROPOSAL_RESPONSE=$(curl -s -X POST "$NODE_URL/gov/submit" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Increase Gas Limit",
            "description": "Proposal to increase the network gas limit from 21000 to 50000 for better transaction throughput",
            "key": "gas_limit", 
            "value": "50000"
        }')
    
    echo "Response: $PROPOSAL_RESPONSE"
    
    # Extract proposal ID (assuming JSON response format)
    PROPOSAL_ID=$(echo "$PROPOSAL_RESPONSE" | grep -o '"proposal_id":[0-9]*' | cut -d':' -f2)
    
    if [ -z "$PROPOSAL_ID" ]; then
        echo "❌ Failed to submit proposal"
        exit 1
    fi
    
    echo "✅ Proposal submitted with ID: $PROPOSAL_ID"
    return $PROPOSAL_ID
}

# Function to make deposit
make_deposit() {
    local proposal_id=$1
    echo "💰 Making deposit on proposal $proposal_id..."
    
    DEPOSIT_RESPONSE=$(curl -s -X POST "$NODE_URL/gov/deposit" \
        -H "Content-Type: application/json" \
        -d "{
            \"depositor\": \"$DEPOSITOR\",
            \"proposal_id\": $proposal_id,
            \"amount\": 1000000000
        }")
    
    echo "Response: $DEPOSIT_RESPONSE"
    echo "✅ Deposit made"
}

# Function to cast vote
cast_vote() {
    local proposal_id=$1
    local voter=$2
    local option=$3
    
    echo "🗳️  Casting $option vote from $voter on proposal $proposal_id..."
    
    VOTE_RESPONSE=$(curl -s -X POST "$NODE_URL/gov/vote" \
        -H "Content-Type: application/json" \
        -d "{
            \"voter\": \"$voter\",
            \"proposal_id\": $proposal_id,
            \"option\": \"$option\"
        }")
    
    echo "Response: $VOTE_RESPONSE"
    echo "✅ Vote cast"
}

# Function to get proposal details
get_proposal() {
    local proposal_id=$1
    echo "📋 Getting proposal $proposal_id details..."
    
    PROPOSAL_DETAILS=$(curl -s "$NODE_URL/gov/proposal/$proposal_id")
    echo "Proposal details: $PROPOSAL_DETAILS"
}

# Function to get vote tally
get_tally() {
    local proposal_id=$1
    echo "📊 Getting vote tally for proposal $proposal_id..."
    
    TALLY=$(curl -s "$NODE_URL/gov/tally/$proposal_id")
    echo "Vote tally: $TALLY"
}

# Function to get governance config
get_config() {
    echo "⚙️  Getting governance configuration..."
    
    CONFIG=$(curl -s "$NODE_URL/gov/config")
    echo "Governance config: $CONFIG"
}

# Main test flow
main() {
    check_node
    
    echo ""
    get_config
    
    echo ""
    submit_proposal
    local proposal_id=$?
    
    echo ""
    get_proposal $proposal_id
    
    echo ""
    make_deposit $proposal_id
    
    echo ""
    get_proposal $proposal_id
    
    echo ""
    cast_vote $proposal_id "$VOTER1" "yes"
    
    echo ""
    cast_vote $proposal_id "$VOTER2" "no"
    
    echo ""
    get_tally $proposal_id
    
    echo ""
    echo "🎉 Governance integration test completed!"
    echo ""
    echo "Summary:"
    echo "- ✅ Proposal submitted (ID: $proposal_id)"
    echo "- ✅ Deposit made (should transition to voting period)"
    echo "- ✅ Votes cast from multiple users"
    echo "- ✅ Tally retrieved"
    echo ""
    echo "Note: For full end-to-end testing, wait for the voting period to end"
    echo "and check if the proposal gets executed automatically."
}

# Run the test
main "$@"