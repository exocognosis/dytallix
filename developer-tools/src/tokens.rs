//! Centralized Token Definitions for Dytallix Dual-Token System
//! DGT (Governance Token) and DRT (Reward Token)

/// Token roles in the dual-token system
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TokenRole {
    Governance,
    Rewards,
}

/// Token metadata structure
#[derive(Debug, Clone)]
pub struct TokenMetadata {
    pub symbol: &'static str,
    pub micro_denom: &'static str,
    pub decimals: u8,
    pub display_name: &'static str,
    pub role: TokenRole,
    pub description: &'static str,
}

/// DGT (Governance Token) metadata
pub const DGT_TOKEN: TokenMetadata = TokenMetadata {
    symbol: "DGT",
    micro_denom: "udgt",
    decimals: 6,
    display_name: "Dytallix Governance Token",
    role: TokenRole::Governance,
    description: "Used for governance voting, staking, fees, and protocol decisions",
};

/// DRT (Reward Token) metadata
pub const DRT_TOKEN: TokenMetadata = TokenMetadata {
    symbol: "DRT",
    micro_denom: "udrt",
    decimals: 6,
    display_name: "Dytallix Reward Token",
    role: TokenRole::Rewards,
    description: "Used for rewards, incentives, staking rewards, and AI service payments",
};

/// Constants for common operations
pub const DGT_DECIMALS: u8 = 6;
pub const DRT_DECIMALS: u8 = 6;
pub const MICRO_UNIT_FACTOR: u64 = 1_000_000; // 10^6

/// Convert micro-denomination amount to display amount
pub fn micro_to_display(amount: u64, denom: &str) -> f64 {
    let token =
        get_token_by_micro_denom(denom).unwrap_or_else(|| panic!("Unknown denomination: {denom}"));

    let divisor = 10u64.pow(token.decimals as u32) as f64;
    amount as f64 / divisor
}

/// Convert display amount to micro-denomination amount
pub fn display_to_micro(amount: f64, denom: &str) -> u64 {
    let token =
        get_token_by_micro_denom(denom).unwrap_or_else(|| panic!("Unknown denomination: {denom}"));

    let multiplier = 10u64.pow(token.decimals as u32) as f64;
    (amount * multiplier) as u64
}

/// Get token metadata by micro denomination
pub fn get_token_by_micro_denom(micro_denom: &str) -> Option<&'static TokenMetadata> {
    match micro_denom {
        "udgt" => Some(&DGT_TOKEN),
        "udrt" => Some(&DRT_TOKEN),
        _ => None,
    }
}

/// Get token metadata by symbol
pub fn get_token_by_symbol(symbol: &str) -> Option<&'static TokenMetadata> {
    match symbol {
        "DGT" => Some(&DGT_TOKEN),
        "DRT" => Some(&DRT_TOKEN),
        _ => None,
    }
}

/// Format amount with token symbol
pub fn format_amount_with_symbol(amount_in_micro: u64, denom: &str) -> String {
    let token =
        get_token_by_micro_denom(denom).unwrap_or_else(|| panic!("Unknown denomination: {denom}"));

    let formatted = micro_to_display(amount_in_micro, denom);
    format!("{formatted:.6} {}", token.symbol)
}

/// Get all supported tokens
pub fn get_all_tokens() -> Vec<&'static TokenMetadata> {
    vec![&DGT_TOKEN, &DRT_TOKEN]
}

/// Check if a denomination is valid
pub fn is_valid_denom(denom: &str) -> bool {
    matches!(denom, "udgt" | "udrt")
}

/// Check if a token symbol is valid
pub fn is_valid_symbol(symbol: &str) -> bool {
    matches!(symbol, "DGT" | "DRT")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_micro_to_display_conversion() {
        assert_eq!(micro_to_display(1_000_000, "udgt"), 1.0);
        assert_eq!(micro_to_display(500_000, "udrt"), 0.5);
    }

    #[test]
    fn test_display_to_micro_conversion() {
        assert_eq!(display_to_micro(1.0, "udgt"), 1_000_000);
        assert_eq!(display_to_micro(0.5, "udrt"), 500_000);
    }

    #[test]
    fn test_token_lookup() {
        let dgt = get_token_by_symbol("DGT").unwrap();
        assert_eq!(dgt.symbol, "DGT");
        assert_eq!(dgt.micro_denom, "udgt");

        let drt = get_token_by_micro_denom("udrt").unwrap();
        assert_eq!(drt.symbol, "DRT");
        assert_eq!(drt.micro_denom, "udrt");
    }

    #[test]
    fn test_format_amount_with_symbol() {
        let formatted = format_amount_with_symbol(1_500_000, "udgt");
        assert_eq!(formatted, "1.500000 DGT");
    }

    #[test]
    fn test_validation() {
        assert!(is_valid_denom("udgt"));
        assert!(is_valid_denom("udrt"));
        assert!(!is_valid_denom("udyt"));

        assert!(is_valid_symbol("DGT"));
        assert!(is_valid_symbol("DRT"));
        assert!(!is_valid_symbol("DYT"));
    }

    #[test]
    fn test_token_metadata_fields() {
        // Test all fields of TokenMetadata to prevent dead code warnings
        let token = get_token_by_symbol("DGT").unwrap();

        // Access all fields
        assert_eq!(token.symbol, "DGT");
        assert_eq!(token.micro_denom, "udgt");
        assert_eq!(token.decimals, 6);
        assert!(!token.display_name.is_empty());
        assert!(!token.description.is_empty());

        // Test role field (valid roles)
        match token.role {
            TokenRole::Governance | TokenRole::Rewards => {
                // Valid role
            }
        }
    }

    #[test]
    fn test_all_token_functions() {
        // Test get_all_tokens function
        let all_tokens = get_all_tokens();
        assert!(!all_tokens.is_empty());

        // Test display_to_micro function
        let micro_amount = display_to_micro(1.5, "udgt");
        assert_eq!(micro_amount, 1_500_000);

        // Test get_token_by_symbol function
        let token = get_token_by_symbol("DGT");
        assert!(token.is_some());

        // Test is_valid_denom function
        assert!(is_valid_denom("udgt"));

        // Test is_valid_symbol function
        assert!(is_valid_symbol("DGT"));
    }
}
