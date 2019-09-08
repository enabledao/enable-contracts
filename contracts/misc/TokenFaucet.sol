pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";

contract TokenFaucet is Ownable {
  using SafeMath for uint256;

  uint256 private _allowance = 1000;
  uint256 private TEN = 10;

  function allowance () public view returns (uint256) {
    return _allowance;
  }

  function balanceAt (address _token) public view returns (uint256) {
    return ERC20Detailed(_token).balanceOf(address(this));
  }

  function request (address _token) public {
    ERC20Detailed token = ERC20Detailed(_token);

    uint256 decimals = token.decimals();
    uint256 balance = token.balanceOf(address(this));
    uint256 parsedAllowance = _allowance.mul(TEN**decimals);

    if (balance < parsedAllowance) {
      _transferTo(token, msg.sender, balance);
    } else {
      _transferTo(token, msg.sender, parsedAllowance);
    }
  }

  function setAllowance (uint256 amount) public onlyOwner {
    _allowance = amount;
  }

  function _transferTo (ERC20Detailed _token, address _recipient, uint256 _amount) internal {
    _token.transfer(_recipient, _amount);
  }

  function() external {
    revert('function: request(address)');
  }
}
