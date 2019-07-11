pragma solidity ^0.5.2;

import "../Crowdsale.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title ERC20FundedCrowdsale
 * @dev Crowdsale that raises funds in an ERC20 token (instead of Ether).
 * IMPORTANT: `weiRaised` indicates the number of `fundingToken`s raised (not Ether)
 *
 * Developed by blockimmo AG (https://blockimmo.ch/)
 */
contract ERC20FundedCrowdsale is Crowdsale {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 private _fundingToken; // ERC20 token funds will be raised in

    /**
     * @param fundingToken IERC20 Address of the token funds will be raised in (i.e. Dai Stablecoin, Crypto Franc (XCHF), etc...).
     */
    constructor(IERC20 fundingToken) internal {
        require(address(fundingToken) != address(0));
        _fundingToken = fundingToken;
    }

    /**
     * @return The token funds are being raised in.
     */
    function fundingToken() public view returns (IERC20) {
        return _fundingToken;
    }

    /**
     * @dev Forwards `fundingToken`s to `wallet`.
     */
    function _forwardFunds() internal {
        fundingToken().safeTransferFrom(msg.sender, wallet(), _weiAmount());
    }

    /**
     * @dev Determines the value (in `fundingToken`) included with a purchase.
     */
    function _weiAmount() internal view returns (uint256) {
        return fundingToken().allowance(msg.sender, address(this));
    }

}
