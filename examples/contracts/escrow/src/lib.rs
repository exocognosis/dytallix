// Escrow contract implementation
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct EscrowDeal {
    pub buyer: String,
    pub seller: String,
    pub arbiter: String,
    pub amount: u64,
    pub status: EscrowStatus,
}

#[derive(Debug, Clone)]
pub enum EscrowStatus {
    Active,
    Released,
    Refunded,
    Disputed,
}

#[derive(Default)]
pub struct EscrowContract {
    deals: HashMap<u64, EscrowDeal>,
    next_deal_id: u64,
}

impl EscrowContract {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn create_deal(&mut self, buyer: String, seller: String, arbiter: String, amount: u64) -> u64 {
        let deal_id = self.next_deal_id;
        self.next_deal_id += 1;
        
        let deal = EscrowDeal {
            buyer,
            seller,
            arbiter,
            amount,
            status: EscrowStatus::Active,
        };
        
        self.deals.insert(deal_id, deal);
        deal_id
    }

    pub fn release_funds(&mut self, deal_id: u64, caller: &str) -> Result<(), &'static str> {
        let deal = self.deals.get_mut(&deal_id).ok_or("Deal not found")?;
        
        if caller != deal.buyer && caller != deal.arbiter {
            return Err("Unauthorized");
        }
        
        match deal.status {
            EscrowStatus::Active => {
                deal.status = EscrowStatus::Released;
                Ok(())
            }
            _ => Err("Deal not active"),
        }
    }

    pub fn get_deal(&self, deal_id: u64) -> Option<&EscrowDeal> {
        self.deals.get(&deal_id)
    }
}