// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmissionSchedule {
    uint256 public constant ANNUAL_RATE = 5; // percent

    function emissionFor(uint256 supply) external pure returns (uint256) {
        return supply * ANNUAL_RATE / 100;
    }
}
