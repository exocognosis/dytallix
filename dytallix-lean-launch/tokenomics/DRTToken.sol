// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DRTToken {
    string public name = "Dytallix Reward Token";
    string public symbol = "DRT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public emissionSchedule;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    modifier onlyEmission() {
        require(msg.sender == emissionSchedule, "not emission");
        _;
    }

    constructor() {
        emissionSchedule = msg.sender;
    }

    function setEmission(address _emission) external onlyEmission {
        emissionSchedule = _emission;
    }

    function mint(address to, uint256 amount) external onlyEmission {
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "balance too low");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance too low");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "balance too low");
        require(allowance[from][msg.sender] >= amount, "allowance too low");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
