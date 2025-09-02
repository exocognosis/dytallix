// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBurnManager {
    function burnFrom(address user, uint256 amount) external;
}

contract BurnModule {
    IBurnManager public manager;

    constructor(address mgr) {
        manager = IBurnManager(mgr);
    }

    function triggerBurn(address user, uint256 amount) external {
        manager.burnFrom(user, amount);
    }
}
