// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Proxy {
    address public impl;
    constructor(address i){ impl=i; }
    fallback() external payable {
        address _impl = impl;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
