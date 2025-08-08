// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DRTToken.sol";

contract EmissionSchedule {
    DRTToken public immutable token;
    uint256 public rate; // tokens per call

    constructor(address tokenAddress, uint256 _rate) {
        token = DRTToken(tokenAddress);
        rate = _rate;
    }

    function emitTokens(address to) external {
        token.mint(to, rate);
    }
}
