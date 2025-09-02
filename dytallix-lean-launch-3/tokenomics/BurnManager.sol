// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBurnable {
    function burn(uint256 amount) external;
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract BurnManager {
    IBurnable public token;

    constructor(address tokenAddress) {
        token = IBurnable(tokenAddress);
    }

    function burnFrom(address user, uint256 amount) external {
        require(token.allowance(user, address(this)) >= amount, "allowance");
        token.transferFrom(user, address(this), amount);
        token.burn(amount);
    }
}
