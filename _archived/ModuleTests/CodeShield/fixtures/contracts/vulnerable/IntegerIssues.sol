// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IntegerIssues {
    function sub(uint256 a, uint256 b) external pure returns (uint256) {
        return a - b; // underflow pre-0.8, but kept as pattern
    }
}
