pub struct GasOutcome { 
    pub gas_limit: u64, 
    pub gas_used: u64 
}

impl GasOutcome { 
    pub fn remaining(&self) -> u64 { 
        self.gas_limit - self.gas_used 
    } 
}

pub fn finalize_gas(gas_limit: u64, remaining: u64) -> GasOutcome { 
    GasOutcome { 
        gas_limit, 
        gas_used: gas_limit - remaining 
    } 
}