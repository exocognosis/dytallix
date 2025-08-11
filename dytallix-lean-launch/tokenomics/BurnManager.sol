// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DRTToken.sol";

contract BurnManager {
    DRTToken public immutable token;

    constructor(address tokenAddress) {
        token = DRTToken(tokenAddress);
    }

    function burn(address from, uint256 amount) external {
        require(token.allowance(from, address(this)) >= amount, "allowance");
        token.transferFrom(from, address(this), amount);
        token.burn(amount);
    }
}
