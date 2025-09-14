// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Lib {
    address public owner;
    function pwn() external { owner = msg.sender; }
}
contract Victim {
    address public owner;
    address public lib;
    constructor(address _lib){ owner=msg.sender; lib=_lib; }
    function attack() external {
        // delegatecall into untrusted lib
        (bool ok,) = lib.delegatecall(abi.encodeWithSignature("pwn()"));
        require(ok, "dc fail");
    }
}
