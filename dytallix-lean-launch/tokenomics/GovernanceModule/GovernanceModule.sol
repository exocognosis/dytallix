// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../DGTToken.sol";

contract GovernanceModule {
    DGTToken public immutable token;

    struct Proposal {
        string description;
        uint256 votes;
        bool executed;
    }

    Proposal[] public proposals;

    constructor(address _token) {
        token = DGTToken(_token);
    }

    function propose(string calldata desc) external {
        proposals.push(Proposal(desc, 0, false));
    }

    function vote(uint256 id, uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount));
        proposals[id].votes += amount * amount; // quadratic
    }
}
