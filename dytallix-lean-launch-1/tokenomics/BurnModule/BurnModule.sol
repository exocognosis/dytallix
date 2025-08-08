// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../DRTToken.sol";
import "../BurnManager.sol";

contract BurnModule {
    BurnManager public immutable manager;
    DRTToken public immutable token;

    constructor(address _token, address _manager) {
        token = DRTToken(_token);
        manager = BurnManager(_manager);
    }

    function burnFees(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount));
        token.approve(address(manager), amount);
        manager.burn(address(this), amount);
    }
}
