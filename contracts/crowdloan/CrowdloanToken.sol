pragma solidity 0.5.11;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";
import "./ICrowdloan.sol";

contract CrowdloanToken is StandaloneERC20 {
    using SafeMath for uint256;

    ICrowdloan crowdloan;
    mapping(address => uint256) claimedTokens;

    function initialize(
      string memory name,
      string memory symbol,
      uint256 decimals,
      address loanAddress,

    ) public {
        address[] memory emptyAdressArray = new address[](0);
        crowdloan = ICrowdloan(loanAddress);

        StandaloneERC20.initialize( name, symbol, uint8(decimals), crowdloan.principalRequested(), address(this),
          emptyAdressArray, emptyAdressArray );
    }

    function claimTokens (address claimant) public {
      uint256 addressClaimed = claimedTokens[claimant];
      uint256 tokensDue = crowdloan.amountContributed(claimant).sub(addressClaimed);
      require(tokensDue > 0, 'No tokens to Claim');
      IERC20(address(this)).transfer(claimant, tokensDue);
    }
}
