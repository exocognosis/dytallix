// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StakingModule {
    mapping(address => uint256) public stakes;

    function stake(uint256 amount) external {
        stakes[msg.sender] += amount;
    }

    function unstake(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "stake");
        stakes[msg.sender] -= amount;
    }
}
