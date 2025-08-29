# Dytallix Public Testnet Policy

## Overview

This document establishes the operational policies, guidelines, and expectations for participants in the Dytallix Public Testnet. The testnet serves as a testing environment for validators, developers, and users to experiment with blockchain functionality before mainnet deployment.

## Testnet Objectives

### Primary Goals

1. **Consensus Testing**: Validate Byzantine Fault Tolerant consensus mechanism
2. **Performance Validation**: Test transaction throughput and block production
3. **Network Stability**: Assess network resilience under various conditions
4. **Feature Testing**: Validate new features and protocol upgrades
5. **Security Assessment**: Identify and resolve security vulnerabilities
6. **Community Building**: Engage and educate the developer community

### Success Criteria

- **Uptime**: 99.5% network availability over 30-day periods
- **Performance**: Consistent 6-second block times under normal load
- **Participation**: Minimum 10 active validators with geographic distribution
- **Stability**: No consensus failures or network forks
- **Security**: No successful attacks or exploits discovered

## Testnet Architecture

### Network Configuration

- **Chain ID**: `dytallix-testnet-1`
- **Genesis Time**: 2025-09-01T00:00:00Z
- **Block Time**: 6 seconds target
- **Consensus Algorithm**: Tendermint BFT with Dilithium3 PQC signatures
- **Governance**: On-chain governance with 7-day voting period

### Token Economics

#### Test Tokens
- **DGT (Dytallix Governance Token)**: 100,000,000 total supply
- **DRT (Dytallix Resource Token)**: Unlimited supply for gas fees
- **Distribution**: Faucet distribution for testing purposes
- **Value**: No real-world value, testing purposes only

#### Faucet Configuration
- **DGT Distribution**: 1,000 DGT per request, max 5,000 DGT per address
- **DRT Distribution**: 10,000 DRT per request, unlimited requests
- **Rate Limiting**: 1 request per address per hour
- **Reset Policy**: Weekly faucet balance reset for active testing

### Validator Requirements

#### Minimum Hardware Specifications
- **CPU**: 4 cores, 2.4GHz or equivalent
- **Memory**: 8GB RAM minimum, 16GB recommended
- **Storage**: 100GB SSD with IOPS 1000+
- **Network**: 100 Mbps reliable internet connection
- **Operating System**: Ubuntu 20.04 LTS or later

#### Validator Responsibilities
- **Uptime**: Maintain 95% uptime (measured over 30-day periods)
- **Security**: Implement proper key management and operational security
- **Updates**: Install protocol upgrades within 48 hours of release
- **Communication**: Participate in validator communication channels
- **Monitoring**: Implement comprehensive monitoring and alerting

## Participation Guidelines

### Validator Onboarding

#### Application Process
1. **Registration**: Complete validator application form
2. **Technical Review**: Demonstrate technical competency
3. **Security Assessment**: Validate security practices
4. **Testnet Deployment**: Deploy and configure validator node
5. **Performance Validation**: 7-day probationary period

#### Initial Stake Requirements
- **Self-Stake**: Minimum 10,000 DGT self-delegation
- **Total Stake**: Minimum 50,000 DGT including delegations
- **Validator Bond**: 1,000 DGT slashable security deposit
- **Commission**: Maximum 20% commission rate

### Developer Participation

#### Testing Environment Access
- **RPC Endpoints**: Public RPC nodes for application development
- **API Access**: RESTful API and gRPC interfaces
- **WebSocket**: Real-time event subscriptions
- **Testnet Explorer**: Block explorer for transaction monitoring

#### Development Support
- **Documentation**: Comprehensive API and SDK documentation
- **Sample Code**: Reference implementations and tutorials
- **Developer Tools**: CLI tools, SDKs, and testing frameworks
- **Support Channels**: Discord, GitHub issues, and office hours

### User Testing

#### Account Creation
- **Wallet Support**: Compatible with Keplr, Cosmostation, and CLI
- **Address Format**: Bech32 addresses with 'dytallix' prefix
- **Key Management**: Support for hardware wallets and HD derivation
- **Backup**: Mnemonic phrase backup and recovery

#### Testing Activities
- **Token Transfers**: Test basic send/receive functionality
- **Staking Operations**: Delegate, undelegate, and redelegate tokens
- **Governance**: Participate in on-chain governance proposals
- **Contract Interaction**: Deploy and interact with smart contracts

## Network Governance

### On-Chain Governance

#### Proposal Types
- **Text Proposals**: General governance discussions
- **Parameter Changes**: Modify blockchain parameters
- **Software Upgrades**: Coordinate protocol upgrades
- **Community Pool**: Spending from community development fund

#### Voting Process
- **Proposal Deposit**: 500 DGT minimum deposit to submit proposal
- **Voting Period**: 7 days for standard proposals, 3 days for urgent
- **Quorum**: 33.4% of bonded tokens must participate
- **Threshold**: 50% yes votes required for passage
- **Veto**: 33.4% veto votes reject proposal regardless of yes votes

#### Governance Parameters
- **Min Deposit**: 500 DGT
- **Max Deposit Period**: 2 days
- **Voting Period**: 7 days
- **Quorum**: 0.334 (33.4%)
- **Threshold**: 0.5 (50%)
- **Veto Threshold**: 0.334 (33.4%)

### Off-Chain Coordination

#### Validator Communication
- **Discord Server**: Real-time communication and support
- **Governance Forum**: Formal proposal discussion
- **Technical Calls**: Bi-weekly validator technical meetings
- **Emergency Contacts**: 24/7 emergency response procedures

#### Upgrade Coordination
- **Upgrade Proposals**: Minimum 2 weeks notice for major upgrades
- **Testing Period**: 1 week testing period on upgrade testnet
- **Go/No-Go Decision**: Community consensus before upgrade execution
- **Rollback Procedures**: Clear rollback process for failed upgrades

## Risk Management

### Operational Risks

#### Network Partitions
- **Monitoring**: Automated detection of network connectivity issues
- **Response**: Documented procedures for partition recovery
- **Communication**: Real-time status updates during incidents
- **Prevention**: Geographic diversity requirements for validators

#### Consensus Failures
- **Detection**: Automated monitoring for consensus anomalies
- **Response**: Emergency halt procedures if necessary
- **Recovery**: Network restart procedures with state preservation
- **Analysis**: Post-incident analysis and improvement implementation

### Security Risks

#### Validator Key Compromise
- **Detection**: Unusual signing patterns and double-signing alerts
- **Response**: Immediate validator jailing and investigation
- **Recovery**: Key rotation procedures and security assessment
- **Prevention**: Security best practices and HSM recommendations

#### Smart Contract Vulnerabilities
- **Prevention**: Mandatory security audits for critical contracts
- **Detection**: Runtime monitoring for anomalous contract behavior
- **Response**: Emergency pause mechanisms for vulnerable contracts
- **Recovery**: Contract upgrade or migration procedures

### Economic Risks

#### Token Distribution Imbalances
- **Monitoring**: Track token distribution and concentration
- **Mitigation**: Faucet limits and distribution guidelines
- **Response**: Adjust faucet parameters to maintain test balance
- **Prevention**: Regular review of economic parameters

#### Spam and DoS Attacks
- **Prevention**: Gas fees and rate limiting mechanisms
- **Detection**: Automated monitoring for unusual activity patterns
- **Response**: Dynamic fee adjustment and rate limiting
- **Recovery**: Network recovery procedures after attacks

## Data Management

### Testnet Data Policy

#### Data Retention
- **Blockchain Data**: Permanent retention for historical analysis
- **Log Data**: 90 days retention for operational logs
- **Personal Data**: Minimal collection, 30 days retention
- **Metrics Data**: 1 year retention for performance analysis

#### Data Privacy
- **Anonymization**: Personal identifiers removed from public data
- **Access Controls**: Restricted access to sensitive operational data
- **Encryption**: Data encrypted at rest and in transit
- **Compliance**: GDPR compliance for EU participant data

### Research and Analytics

#### Performance Metrics
- **Network Metrics**: Block times, transaction throughput, finality
- **Validator Metrics**: Uptime, performance, delegation patterns
- **Economic Metrics**: Token distribution, staking ratios, fee patterns
- **Security Metrics**: Attack attempts, vulnerability discoveries

#### Data Sharing
- **Public Metrics**: Aggregated, anonymized performance data
- **Research Partnerships**: Selective data sharing for academic research
- **Community Reports**: Regular public reports on testnet status
- **Privacy Protection**: Strict privacy controls on all shared data

## Incentives and Rewards

### Validator Incentives

#### Performance Rewards
- **Uptime Bonuses**: Monthly rewards for high uptime validators
- **Performance Recognition**: Public recognition for top performers
- **Early Access**: Priority access to mainnet validator programs
- **Technical Support**: Enhanced technical support and resources

#### Reputation System
- **Validator Scores**: Public scoring based on performance metrics
- **Community Feedback**: Delegator feedback and rating systems
- **Historical Performance**: Long-term performance tracking
- **Mainnet Consideration**: Testnet performance influence on mainnet selection

### Developer Incentives

#### Bug Bounty Program
- **Scope**: Protocol vulnerabilities, smart contract issues, tooling bugs
- **Rewards**: DGT tokens and public recognition
- **Severity Levels**: Critical ($1000), High ($500), Medium ($250), Low ($100)
- **Responsible Disclosure**: Private reporting with coordinated disclosure

#### Development Grants
- **Ecosystem Tools**: Funding for developer tools and infrastructure
- **Educational Content**: Grants for tutorials, documentation, and workshops
- **Integration Projects**: Support for wallet and service integrations
- **Research Projects**: Academic research and protocol improvements

### Community Incentives

#### Participation Rewards
- **Testing Activities**: Rewards for comprehensive testing and feedback
- **Community Building**: Recognition for community contribution and support
- **Content Creation**: Incentives for educational content and tutorials
- **Governance Participation**: Rewards for active governance participation

#### Ambassador Program
- **Community Ambassadors**: Technical community leaders and advocates
- **Responsibilities**: Community support, content creation, event organization
- **Benefits**: Direct access to development team, exclusive updates
- **Selection**: Community nomination and team approval process

## Termination and Migration

### Testnet Lifecycle

#### Planned Termination
- **Timeline**: 6-month minimum testnet operation before termination
- **Notice**: 30-day advance notice of termination
- **Data Export**: Comprehensive data export for analysis and migration
- **Migration Path**: Clear migration path to mainnet or successor testnet

#### Emergency Termination
- **Trigger Conditions**: Critical security vulnerabilities or operational failures
- **Decision Process**: Emergency response team consensus
- **Communication**: Immediate notification to all participants
- **Recovery Plan**: Clear steps for data preservation and recovery

### Mainnet Migration

#### Validator Transition
- **Selection Process**: Performance-based selection for mainnet validators
- **Requirements**: Enhanced requirements for mainnet operation
- **Migration Support**: Technical and operational support for transition
- **Timeline**: Coordinated migration schedule with advance planning

#### Data and State Migration
- **State Snapshot**: Final testnet state export for analysis
- **Configuration Migration**: Tested migration of network configurations
- **Tool Migration**: Updated tools and documentation for mainnet
- **Community Migration**: Coordinated community transition support

## Compliance and Legal

### Regulatory Compliance

#### Jurisdictional Considerations
- **International Participation**: Welcome participants from compliant jurisdictions
- **Regulatory Restrictions**: Exclude participants from restricted jurisdictions
- **Compliance Monitoring**: Regular review of regulatory landscape
- **Legal Consultation**: Ongoing legal guidance on compliance requirements

#### Terms of Service
- **Participation Agreement**: Clear terms for testnet participation
- **Liability Limitations**: Appropriate liability protections
- **Intellectual Property**: Clear IP rights and licensing terms
- **Dispute Resolution**: Mechanisms for resolving participant disputes

### Risk Disclaimers

#### Testing Environment Warnings
- **No Real Value**: Testnet tokens have no economic value
- **Experimental Software**: Software is experimental and may contain bugs
- **Data Loss Risk**: Potential for data loss or network resets
- **No Guarantees**: No warranties or guarantees of service availability

#### Security Considerations
- **Personal Responsibility**: Participants responsible for their own security
- **Key Management**: Proper key management and backup procedures required
- **Network Risks**: Acknowledgment of inherent blockchain network risks
- **Privacy Considerations**: Understanding of public blockchain transparency

This testnet policy provides the framework for successful, secure, and productive testing of the Dytallix blockchain protocol while protecting participants and maintaining network integrity.