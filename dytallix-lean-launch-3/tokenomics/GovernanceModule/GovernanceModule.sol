// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GovernanceModule {
    mapping(address => uint256) public votes;

    function vote(uint256 amount) external {
        votes[msg.sender] += amount;
    }
}
