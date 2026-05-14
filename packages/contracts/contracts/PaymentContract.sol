// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentContract is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public treasury;
    uint256 public playFee;

    event PaymentReceived(address indexed payer, uint256 amount);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event PlayFeeUpdated(uint256 previousPlayFee, uint256 newPlayFee);

    error InvalidAddress();
    error InvalidPlayFee();

    constructor(address tokenAddress, address treasuryAddress, uint256 initialPlayFee, address initialOwner)
        Ownable(initialOwner)
    {
        if (tokenAddress == address(0) || treasuryAddress == address(0) || initialOwner == address(0)) {
            revert InvalidAddress();
        }
        if (initialPlayFee == 0) {
            revert InvalidPlayFee();
        }

        token = IERC20(tokenAddress);
        treasury = treasuryAddress;
        playFee = initialPlayFee;
    }

    function pay() external {
        uint256 amount = playFee;
        token.safeTransferFrom(msg.sender, treasury, amount);
        emit PaymentReceived(msg.sender, amount);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) {
            revert InvalidAddress();
        }

        address previousTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(previousTreasury, newTreasury);
    }

    function setPlayFee(uint256 newPlayFee) external onlyOwner {
        if (newPlayFee == 0) {
            revert InvalidPlayFee();
        }

        uint256 previousPlayFee = playFee;
        playFee = newPlayFee;
        emit PlayFeeUpdated(previousPlayFee, newPlayFee);
    }
}
