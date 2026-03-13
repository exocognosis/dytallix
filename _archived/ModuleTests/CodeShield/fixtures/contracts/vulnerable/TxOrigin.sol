// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TxOriginAuth {
    address owner;
    constructor(){ owner = msg.sender; }
    function adminOnly() external view {
        require(tx.origin == owner, "forbidden");
    }
}
