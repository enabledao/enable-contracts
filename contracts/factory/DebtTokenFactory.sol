pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../debt-token/DebtToken.sol";

contract DebtTokenFactory is Ownable {
    event tokenCreated(address indexed owner, address indexed token);

    function createDebtToken(string memory _name, string memory _symbol) public returns (address) {
        DebtToken token = new DebtToken(_name, _symbol);
        emit tokenCreated(msg.sender, address(token));
        return address(token);
    }
}
