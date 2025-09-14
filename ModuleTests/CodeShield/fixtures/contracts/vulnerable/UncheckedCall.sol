// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface I {
    function f() external;
}
contract UncheckedCall {
    function doCall(address a) external {
        // unchecked low-level call
        (bool, ) = a.call(abi.encodeWithSelector(I.f.selector));
    }
}
