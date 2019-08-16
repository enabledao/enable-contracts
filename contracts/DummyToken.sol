pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";

contract DummyToken is StandaloneERC20 {
  function initialize (string memory name, string memory symbol, uint256 decimals) public {
    address [] memory minters = new address[](1);
    address [] memory pausers;
    minters[0] = msg.sender;

    StandaloneERC20.initialize(
      name,
      symbol,
      uint8(decimals),
      0,
      address(0),
      minters,
      pausers
    );
  }
}
