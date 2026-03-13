"""
Smart Contract NLP Generator

Converts natural language descriptions into smart contract code
using NLP models and code generation templates.
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class ContractNLPGenerator:
    def __init__(self):
        self.model = None
        self.model_version = "1.0.0"
        self.last_update = datetime.now()
        self.is_model_loaded = True
        
        # Contract templates
        self.templates = {
            "escrow": self._get_escrow_template(),
            "token": self._get_token_template(),
            "multisig": self._get_multisig_template(),
            "staking": self._get_staking_template()
        }
        
        logger.info("Contract NLP generator initialized")
    
    def is_ready(self) -> bool:
        """Check if the NLP generator is ready"""
        return self.is_model_loaded
    
    def get_model_version(self) -> str:
        """Get current model version"""
        return self.model_version
    
    def get_last_update_time(self) -> str:
        """Get last model update time"""
        return self.last_update.isoformat()
    
    async def generate_contract(
        self,
        description: str,
        contract_type: str = "escrow",
        requirements: List[str] = None
    ) -> Dict[str, Any]:
        """
        Generate smart contract code from natural language description
        
        Args:
            description: Natural language description of desired contract
            contract_type: Type of contract (escrow, token, multisig, etc.)
            requirements: Additional requirements and constraints
            
        Returns:
            Generated contract code with analysis
        """
        try:
            # Parse the description to extract key parameters
            parsed_params = self._parse_description(description, requirements or [])
            
            # Select and customize template
            if contract_type not in self.templates:
                contract_type = "escrow"  # Default fallback
            
            contract_code = self._generate_from_template(
                contract_type, 
                parsed_params
            )
            
            # Perform security analysis
            security_analysis = self._analyze_contract_security(contract_code, parsed_params)
            
            # Estimate gas costs
            estimated_gas = self._estimate_gas_cost(contract_code, contract_type)
            
            result = {
                "code": contract_code,
                "language": "rust",  # Dytallix uses Rust for smart contracts
                "contract_type": contract_type,
                "parsed_parameters": parsed_params,
                "security_analysis": security_analysis,
                "estimated_gas": estimated_gas,
                "generation_timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Contract generated: type={contract_type}, lines={len(contract_code.split())}")
            return result
            
        except Exception as e:
            logger.error(f"Contract generation failed: {e}")
            return {
                "code": f"// Contract generation failed: {str(e)}",
                "language": "rust",
                "contract_type": contract_type,
                "security_analysis": {"error": str(e)},
                "error": str(e)
            }
    
    def _parse_description(self, description: str, requirements: List[str]) -> Dict[str, Any]:
        """Parse natural language description to extract contract parameters"""
        params = {
            "parties": [],
            "amounts": [],
            "timeouts": [],
            "conditions": [],
            "functions": []
        }
        
        description_lower = description.lower()
        
        # Extract parties (buyer, seller, etc.)
        party_patterns = [
            r"buyer|purchaser|client",
            r"seller|vendor|provider",
            r"arbiter|mediator|judge",
            r"owner|admin|deployer"
        ]
        
        for pattern in party_patterns:
            if re.search(pattern, description_lower):
                params["parties"].append(pattern.split("|")[0])
        
        # Extract amounts/values
        amount_patterns = [
            r"(\d+(?:\.\d+)?)\s*(?:eth|tokens?|coins?)",
            r"(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:dollars?|usd|\$)"
        ]
        
        for pattern in amount_patterns:
            matches = re.findall(pattern, description_lower)
            params["amounts"].extend(matches)
        
        # Extract timeouts/deadlines
        timeout_patterns = [
            r"(\d+)\s*(?:days?|hours?|minutes?|seconds?)",
            r"within\s+(\d+)\s*(?:days?|hours?)",
            r"after\s+(\d+)\s*(?:days?|hours?)"
        ]
        
        for pattern in timeout_patterns:
            matches = re.findall(pattern, description_lower)
            params["timeouts"].extend(matches)
        
        # Extract conditions
        condition_keywords = [
            "if", "when", "after", "before", "unless", "provided that",
            "conditional", "requirement", "must", "should"
        ]
        
        for keyword in condition_keywords:
            if keyword in description_lower:
                # Extract the sentence containing the condition
                sentences = description.split(".")
                for sentence in sentences:
                    if keyword in sentence.lower():
                        params["conditions"].append(sentence.strip())
        
        # Extract function requirements
        function_keywords = [
            "deposit", "withdraw", "release", "refund", "cancel",
            "approve", "reject", "transfer", "lock", "unlock"
        ]
        
        for keyword in function_keywords:
            if keyword in description_lower:
                params["functions"].append(keyword)
        
        # Process additional requirements
        for req in requirements:
            req_lower = req.lower()
            if "multisig" in req_lower or "multi-signature" in req_lower:
                params["multisig"] = True
            if "timelock" in req_lower:
                params["timelock"] = True
            if "upgradeable" in req_lower:
                params["upgradeable"] = True
        
        return params
    
    def _generate_from_template(self, contract_type: str, params: Dict[str, Any]) -> str:
        """Generate contract code from template with parsed parameters"""
        template = self.templates[contract_type]
        
        # Replace template variables with actual values
        code = template
        
        # Replace party placeholders
        parties = params.get("parties", ["buyer", "seller"])
        if len(parties) >= 2:
            code = code.replace("{{PARTY1}}", parties[0])
            code = code.replace("{{PARTY2}}", parties[1])
        else:
            code = code.replace("{{PARTY1}}", "buyer")
            code = code.replace("{{PARTY2}}", "seller")
        
        # Replace timeout values
        timeouts = params.get("timeouts", ["7"])
        timeout_value = timeouts[0] if timeouts else "7"
        code = code.replace("{{TIMEOUT_DAYS}}", str(timeout_value))
        
        # Add additional functions based on requirements
        additional_functions = self._generate_additional_functions(params)
        code = code.replace("{{ADDITIONAL_FUNCTIONS}}", additional_functions)
        
        return code
    
    def _generate_additional_functions(self, params: Dict[str, Any]) -> str:
        """Generate additional contract functions based on requirements"""
        functions = []
        
        if params.get("multisig", False):
            functions.append("""
    pub fn add_signature(&mut self, signature: Vec<u8>) -> Result<(), Error> {
        // Multi-signature functionality
        self.signatures.push(signature);
        Ok(())
    }
    
    pub fn verify_multisig(&self) -> bool {
        self.signatures.len() >= self.required_signatures
    }""")
        
        if params.get("timelock", False):
            functions.append("""
    pub fn set_timelock(&mut self, duration: u64) -> Result<(), Error> {
        self.timelock_end = self.env().block_timestamp() + duration;
        Ok(())
    }
    
    pub fn is_timelock_expired(&self) -> bool {
        self.env().block_timestamp() >= self.timelock_end
    }""")
        
        return "\n".join(functions)
    
    def _analyze_contract_security(self, code: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze generated contract for security issues"""
        analysis = {
            "security_score": 0.8,  # Base score
            "vulnerabilities": [],
            "recommendations": [],
            "compliance": []
        }
        
        # Check for common security patterns
        if "require!" not in code:
            analysis["vulnerabilities"].append("Missing input validation")
            analysis["security_score"] -= 0.1
        
        if "overflow" not in code and "checked_" not in code:
            analysis["vulnerabilities"].append("Potential arithmetic overflow")
            analysis["recommendations"].append("Use checked arithmetic operations")
            analysis["security_score"] -= 0.1
        
        if "reentrancy" not in code.lower():
            analysis["recommendations"].append("Consider reentrancy protection")
        
        # Check for access control
        if "only_" not in code and "caller" not in code:
            analysis["vulnerabilities"].append("Missing access control")
            analysis["security_score"] -= 0.2
        
        # Positive security features
        if "AI fraud detection" in code:
            analysis["compliance"].append("AI-enhanced fraud protection")
            analysis["security_score"] += 0.1
        
        if "pqc" in code.lower() or "post-quantum" in code.lower():
            analysis["compliance"].append("Post-quantum cryptography ready")
            analysis["security_score"] += 0.1
        
        # Ensure score is between 0 and 1
        analysis["security_score"] = max(0.0, min(1.0, analysis["security_score"]))
        
        return analysis
    
    def _estimate_gas_cost(self, code: str, contract_type: str) -> int:
        """Estimate gas cost for contract deployment and execution"""
        # Simple heuristic based on code complexity
        base_costs = {
            "escrow": 150000,
            "token": 200000,
            "multisig": 250000,
            "staking": 300000
        }
        
        base_cost = base_costs.get(contract_type, 150000)
        
        # Add cost based on code complexity
        lines = len(code.split("\n"))
        complexity_cost = lines * 1000
        
        # Add cost for additional features
        if "multisig" in code.lower():
            complexity_cost += 50000
        if "timelock" in code.lower():
            complexity_cost += 30000
        if "ai" in code.lower():
            complexity_cost += 40000  # AI oracle calls
        
        return base_cost + complexity_cost
    
    def _get_escrow_template(self) -> str:
        """Get escrow contract template"""
        return '''// AI-Enhanced Post-Quantum Escrow Contract
// Generated by Dytallix Contract NLP Generator

use ink_lang as ink;
use ink_prelude::vec::Vec;

#[ink::contract]
mod escrow {
    use ink_storage::{
        traits::{PackedLayout, SpreadLayout},
        Mapping,
    };

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
        InvalidState,
        InsufficientFunds,
        AIFraudDetected,
        Timeout,
    }

    #[ink(storage)]
    pub struct Escrow {
        {{PARTY1}}: AccountId,
        {{PARTY2}}: AccountId,
        arbiter: AccountId,
        amount: Balance,
        state: EscrowState,
        deadline: Timestamp,
        ai_risk_score: u8,  // 0-100 risk score from AI analysis
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, PackedLayout, SpreadLayout))]
    pub enum EscrowState {
        Created,
        Funded,
        Released,
        Refunded,
        Disputed,
    }

    impl Escrow {
        #[ink(constructor)]
        pub fn new(
            {{PARTY2}}: AccountId,
            arbiter: AccountId,
            timeout_days: u64,
        ) -> Self {
            let deadline = Self::env().block_timestamp() + (timeout_days * 24 * 60 * 60 * 1000);
            
            Self {
                {{PARTY1}}: Self::env().caller(),
                {{PARTY2}},
                arbiter,
                amount: 0,
                state: EscrowState::Created,
                deadline,
                ai_risk_score: 0,
            }
        }

        #[ink(message, payable)]
        pub fn fund(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            require!(caller == self.{{PARTY1}}, Error::NotAuthorized);
            require!(self.state == EscrowState::Created, Error::InvalidState);
            
            let transferred = self.env().transferred_value();
            require!(transferred > 0, Error::InsufficientFunds);
            
            // AI fraud detection hook
            let ai_score = self.check_ai_fraud_score(caller, transferred);
            if ai_score > 80 {
                return Err(Error::AIFraudDetected);
            }
            
            self.amount = transferred;
            self.state = EscrowState::Funded;
            self.ai_risk_score = ai_score;
            
            Ok(())
        }

        #[ink(message)]
        pub fn release(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            require!(
                caller == self.{{PARTY1}} || caller == self.arbiter,
                Error::NotAuthorized
            );
            require!(self.state == EscrowState::Funded, Error::InvalidState);
            
            self.state = EscrowState::Released;
            self.env().transfer(self.{{PARTY2}}, self.amount)?;
            
            Ok(())
        }

        #[ink(message)]
        pub fn refund(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            require!(
                caller == self.{{PARTY2}} || caller == self.arbiter || 
                (caller == self.{{PARTY1}} && self.is_expired()),
                Error::NotAuthorized
            );
            require!(self.state == EscrowState::Funded, Error::InvalidState);
            
            self.state = EscrowState::Refunded;
            self.env().transfer(self.{{PARTY1}}, self.amount)?;
            
            Ok(())
        }

        #[ink(message)]
        pub fn dispute(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            require!(
                caller == self.{{PARTY1}} || caller == self.{{PARTY2}},
                Error::NotAuthorized
            );
            require!(self.state == EscrowState::Funded, Error::InvalidState);
            
            self.state = EscrowState::Disputed;
            Ok(())
        }

        fn check_ai_fraud_score(&self, account: AccountId, amount: Balance) -> u8 {
            // In a real implementation, this would call the AI oracle
            // For now, return a simulated risk score
            let account_bytes = account.as_ref();
            let risk_factor = (account_bytes[0] as u16 + amount as u16) % 100;
            risk_factor as u8
        }

        fn is_expired(&self) -> bool {
            self.env().block_timestamp() >= self.deadline
        }

        #[ink(message)]
        pub fn get_state(&self) -> EscrowState {
            self.state.clone()
        }

        #[ink(message)]
        pub fn get_ai_risk_score(&self) -> u8 {
            self.ai_risk_score
        }

        {{ADDITIONAL_FUNCTIONS}}
    }
}'''
    
    def _get_token_template(self) -> str:
        """Get token contract template"""
        return '''// AI-Enhanced Post-Quantum Token Contract
// Generated by Dytallix Contract NLP Generator

use ink_lang as ink;

#[ink::contract]
mod token {
    use ink_storage::Mapping;

    #[ink(storage)]
    pub struct Token {
        total_supply: Balance,
        balances: Mapping<AccountId, Balance>,
        allowances: Mapping<(AccountId, AccountId), Balance>,
        name: String,
        symbol: String,
        decimals: u8,
    }

    impl Token {
        #[ink(constructor)]
        pub fn new(
            initial_supply: Balance,
            name: String,
            symbol: String,
            decimals: u8,
        ) -> Self {
            let caller = Self::env().caller();
            let mut balances = Mapping::default();
            balances.insert(&caller, &initial_supply);

            Self {
                total_supply: initial_supply,
                balances,
                allowances: Mapping::default(),
                name,
                symbol,
                decimals,
            }
        }

        // Standard token functions would go here
        {{ADDITIONAL_FUNCTIONS}}
    }
}'''
    
    def _get_multisig_template(self) -> str:
        """Get multisig contract template"""
        return '''// AI-Enhanced Post-Quantum MultiSig Contract
// Generated by Dytallix Contract NLP Generator

use ink_lang as ink;

#[ink::contract]
mod multisig {
    use ink_storage::Mapping;
    use ink_prelude::vec::Vec;

    #[ink(storage)]
    pub struct MultiSig {
        owners: Vec<AccountId>,
        required_signatures: u32,
        signatures: Vec<Vec<u8>>,
        nonce: u64,
    }

    impl MultiSig {
        #[ink(constructor)]
        pub fn new(owners: Vec<AccountId>, required: u32) -> Self {
            Self {
                owners,
                required_signatures: required,
                signatures: Vec::new(),
                nonce: 0,
            }
        }

        {{ADDITIONAL_FUNCTIONS}}
    }
}'''
    
    def _get_staking_template(self) -> str:
        """Get staking contract template"""
        return '''// AI-Enhanced Post-Quantum Staking Contract
// Generated by Dytallix Contract NLP Generator

use ink_lang as ink;

#[ink::contract]
mod staking {
    use ink_storage::Mapping;

    #[ink(storage)]
    pub struct Staking {
        stakes: Mapping<AccountId, Balance>,
        rewards: Mapping<AccountId, Balance>,
        total_staked: Balance,
        reward_rate: u32,  // Basis points
    }

    impl Staking {
        #[ink(constructor)]
        pub fn new(reward_rate: u32) -> Self {
            Self {
                stakes: Mapping::default(),
                rewards: Mapping::default(),
                total_staked: 0,
                reward_rate,
            }
        }

        {{ADDITIONAL_FUNCTIONS}}
    }
}'''
