// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Base {
    address public owner;
}
contract ImplV1 is Base {
    uint256 public a;
}
contract ImplV2 is Base {
    uint8 public a; // collision
}
