// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../DGTToken.sol";
import "../DRTToken.sol";

contract StakingModule {
    DGTToken public immutable dgt;
    DRTToken public immutable drt;

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public rewardPerToken;

    constructor(address _dgt, address _drt) {
        dgt = DGTToken(_dgt);
        drt = DRTToken(_drt);
    }

    function stake(uint256 amount) external {
        require(dgt.transferFrom(msg.sender, address(this), amount));
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].rewardDebt += amount * rewardPerToken;
    }

    function distribute(uint256 amount) external {
        drt.mint(address(this), amount);
        rewardPerToken += amount / (dgt.balanceOf(address(this)));
    }

    function claim() public {
        uint256 owed = stakes[msg.sender].amount * rewardPerToken - stakes[msg.sender].rewardDebt;
        stakes[msg.sender].rewardDebt += owed;
        drt.transfer(msg.sender, owed);
    }

    function withdraw(uint256 amount) external {
        require(stakes[msg.sender].amount >= amount, "too much");
        claim();
        stakes[msg.sender].amount -= amount;
        dgt.transfer(msg.sender, amount);
    }
}
