#!/usr/bin/env python3
"""
Test script for the contract audit endpoint
"""
import requests
import json

def test_contract_audit():
    """Test the /analyze/contract endpoint"""
    
    # Test contract code (simple Rust smart contract)
    test_contract = """
    use ink_lang as ink;
    
    #[ink::contract]
    mod simple_contract {
        #[ink(storage)]
        pub struct SimpleContract {
            value: u32,
            owner: AccountId,
        }
        
        impl SimpleContract {
            #[ink(constructor)]
            pub fn new(init_value: u32) -> Self {
                Self {
                    value: init_value,
                    owner: Self::env().caller(),
                }
            }
            
            #[ink(message)]
            pub fn get_value(&self) -> u32 {
                self.value
            }
            
            #[ink(message)]
            pub fn set_value(&mut self, new_value: u32) {
                // Missing access control - should be flagged as vulnerability
                self.value = new_value;
            }
            
            #[ink(message)]
            pub fn unsafe_operation(&mut self) {
                // Unsafe operation - should be flagged
                let result = self.value.unwrap();
            }
        }
    }
    """
    
    # Test data
    test_data = {
        "contract_code": test_contract,
        "contract_type": "general",
        "audit_level": "comprehensive"
    }
    
    try:
        print("Testing contract audit endpoint...")
        print("=" * 50)
        
        # Make request to the endpoint
        response = requests.post("http://localhost:8000/analyze/contract", json=test_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Contract audit successful!")
            print(f"Security Score: {result['security_score']}")
            print(f"Gas Efficiency: {result['gas_efficiency']}")
            print(f"Vulnerabilities Found: {len(result['vulnerabilities'])}")
            print(f"Recommendations: {len(result['recommendations'])}")
            print(f"Compliance Flags: {len(result['compliance_flags'])}")
            
            print("\nVulnerabilities:")
            for vuln in result['vulnerabilities']:
                print(f"  - {vuln}")
            
            print("\nRecommendations:")
            for rec in result['recommendations']:
                print(f"  - {rec}")
            
            print("\nCompliance Flags:")
            for flag in result['compliance_flags']:
                print(f"  - {flag}")
            
            # Check if signed response is included
            if 'signed_response' in result:
                print(f"\n✅ Response is cryptographically signed")
                print(f"Signature included: {len(result['signed_response'].get('signature', ''))} bytes")
            else:
                print(f"\n⚠️  Response is not signed (signing service may not be available)")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to server. Make sure the AI services are running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_standard_audit():
    """Test standard audit level"""
    
    test_contract = """
    pub struct BasicContract {
        pub value: u32,
    }
    
    impl BasicContract {
        pub fn new() -> Self {
            Self { value: 0 }
        }
        
        pub fn get_value(&self) -> u32 {
            self.value
        }
    }
    """
    
    test_data = {
        "contract_code": test_contract,
        "contract_type": "token",
        "audit_level": "standard"
    }
    
    try:
        print("\nTesting standard audit level...")
        print("=" * 50)
        
        response = requests.post("http://localhost:8000/analyze/contract", json=test_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Standard audit successful!")
            print(f"Security Score: {result['security_score']}")
            print(f"Gas Efficiency: {result['gas_efficiency']}")
            print(f"Issues Found: {len(result['vulnerabilities'])}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_contract_audit()
    test_standard_audit()
