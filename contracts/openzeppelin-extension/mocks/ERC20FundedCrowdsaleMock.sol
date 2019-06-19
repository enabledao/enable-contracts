pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../distribution/ERC20FundedCrowdsale.sol";

contract ERC20FundedCrowdsaleMock is ERC20FundedCrowdsale {
    constructor (
        uint256 rate,
        address wallet,
        IERC20 token,
        IERC20 fundingToken
    )
        public
        Crowdsale(rate, wallet, token)
        ERC20FundedCrowdsale(fundingToken)
    {}
}