// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VestingSchedule {
    struct Schedule {
        uint256 total;
        uint256 released;
        uint64 start;
        uint64 cliff;
        uint64 duration;
    }

    mapping(address => Schedule) public schedules;

    function setSchedule(address beneficiary, uint256 total, uint64 start, uint64 cliff, uint64 duration) external {
        schedules[beneficiary] = Schedule(total, 0, start, cliff, duration);
    }

    function releasable(address beneficiary) public view returns (uint256) {
        Schedule memory s = schedules[beneficiary];
        if (block.timestamp < s.start + s.cliff) return 0;
        uint256 elapsed = block.timestamp - s.start;
        if (elapsed >= s.duration) {
            return s.total - s.released;
        }
        return (s.total * elapsed / s.duration) - s.released;
    }
}
