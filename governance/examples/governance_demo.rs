use dytallix_governance::*;
use chrono::Utc;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🗳️  Dytallix Governance System Demo");
    println!("===================================");
    
    // Create a file-based governance system
    let data_dir = PathBuf::from("./governance_data");
    let mut governance = FileBasedGovernance::new(data_dir)?;
    
    // Create a proposal
    println!("\n📝 Creating a new proposal...");
    let proposal_id = governance.propose(
        "Upgrade Network Protocol".to_string(),
        "Proposal to upgrade the network protocol to version 2.0 with improved security and performance".to_string(),
        48 // 48 hours voting period
    )?;
    
    println!("✅ Proposal created with ID: {}", proposal_id);
    
    // Get proposal details
    if let Some(proposal) = governance.get_proposal(proposal_id)? {
        println!("\n📋 Proposal Details:");
        println!("   ID: {}", proposal.id);
        println!("   Title: {}", proposal.title);
        println!("   Description: {}", proposal.description);
        println!("   Status: {:?}", proposal.status);
        println!("   Created: {}", proposal.created_at);
        println!("   Voting Deadline: {}", proposal.voting_deadline);
    }
    
    // Cast some votes
    println!("\n🗳️  Casting votes...");
    
    let vote1 = Ballot {
        voter: "alice".to_string(),
        vote: true,
        timestamp: Utc::now(),
    };
    
    let vote2 = Ballot {
        voter: "bob".to_string(),
        vote: true,
        timestamp: Utc::now(),
    };
    
    let vote3 = Ballot {
        voter: "charlie".to_string(),
        vote: false,
        timestamp: Utc::now(),
    };
    
    governance.vote(proposal_id, vote1)?;
    println!("✅ Alice voted: YES");
    
    governance.vote(proposal_id, vote2)?;
    println!("✅ Bob voted: YES");
    
    governance.vote(proposal_id, vote3)?;
    println!("✅ Charlie voted: NO");
    
    // Tally votes
    println!("\n📊 Vote Results:");
    let results = governance.tally(proposal_id)?;
    println!("   Proposal ID: {}", results.proposal_id);
    println!("   YES votes: {}", results.yes_votes);
    println!("   NO votes: {}", results.no_votes);
    println!("   Total votes: {}", results.total_votes);
    println!("   Status: {:?}", results.status);
    
    // List all proposals
    println!("\n📜 All Proposals:");
    let proposals = governance.list_proposals()?;
    for proposal in proposals {
        println!("   ID: {} - Title: {} - Status: {:?}", 
                proposal.id, proposal.title, proposal.status);
    }
    
    // Get vote details
    println!("\n🗳️  Vote Details:");
    let votes = governance.get_votes(proposal_id)?;
    for vote in votes {
        println!("   Voter: {} - Vote: {} - Time: {}", 
                vote.voter, if vote.vote { "YES" } else { "NO" }, vote.timestamp);
    }
    
    // Try to vote twice (should fail)
    println!("\n🚫 Attempting duplicate vote...");
    let duplicate_vote = Ballot {
        voter: "alice".to_string(),
        vote: false,
        timestamp: Utc::now(),
    };
    
    match governance.vote(proposal_id, duplicate_vote) {
        Ok(_) => println!("❌ This should not happen!"),
        Err(GovernanceError::AlreadyVoted) => println!("✅ Duplicate vote correctly rejected"),
        Err(e) => println!("❌ Unexpected error: {:?}", e),
    }
    
    println!("\n✨ Demo completed successfully!");
    println!("💾 All data has been persisted to ./governance_data/");
    
    Ok(())
}
