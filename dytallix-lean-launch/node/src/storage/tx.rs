use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction { pub hash: String, pub from: String, pub to: String, pub amount: u128, pub fee: u128, pub nonce: u64, pub signature: Option<String> }

impl Transaction { pub fn new(hash:String, from:String,to:String,amount:u128,fee:u128,nonce:u64,signature:Option<String>)->Self{Self{hash,from,to,amount,fee,nonce,signature}} }
