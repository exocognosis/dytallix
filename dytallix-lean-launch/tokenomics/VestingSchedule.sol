// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DGTToken.sol";

contract VestingSchedule {
    DGTToken public immutable token;
    struct Grant {
        uint256 amount;
        uint64 start;
        uint64 cliff;
        uint64 duration;
        uint256 released;
    }
    mapping(address => Grant) public grants;

    constructor(address tokenAddress) {
        token = DGTToken(tokenAddress);
    }

    function addGrant(address beneficiary, uint256 amount, uint64 start, uint64 cliff, uint64 duration) external {
        require(grants[beneficiary].amount == 0, "grant exists");
        grants[beneficiary] = Grant(amount, start, cliff, duration, 0);
    }

    function releasable(address beneficiary) public view returns (uint256) {
        Grant memory g = grants[beneficiary];
        if (block.timestamp < g.cliff) return 0;
        uint256 elapsed = block.timestamp - g.start;
        if (elapsed >= g.duration) return g.amount - g.released;
        return (g.amount * elapsed) / g.duration - g.released;
    }

    function release() external {
        uint256 amount = releasable(msg.sender);
        require(amount > 0, "nothing to release");
        grants[msg.sender].released += amount;
        require(token.transfer(msg.sender, amount));
    }
}
