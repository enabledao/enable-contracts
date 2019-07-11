pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "../interface/IDebtManager.sol";

/*
    A debt token representing a stake in a crowdfunded loan.
    It represents a given percentage of ownership.

    The minter contract has minting rights
*/
contract DebtManager is IDebtManager {
    using SafeMath for uint256;

    uint256 _totalDebt;
    mapping(uint256 => uint256) private _tokenDebtValue;

    function _addDebtValue(uint256 tokenId, uint256 debtValue) internal returns (bool) {
        require(_tokenDebtValue[tokenId] == 0, "Debt value already set and can only be cleared");
        _totalDebt = _totalDebt.add(debtValue);
        _tokenDebtValue[tokenId] = debtValue;
    }

    function _removeDebtValue(uint256 tokenId) internal returns (bool) {
        uint256 debtValue = _tokenDebtValue[tokenId];
        _tokenDebtValue[tokenId] = 0;
        _totalDebt = _totalDebt.sub(debtValue);
    }

    function totalDebt() public view returns (uint256) {
        return _totalDebt;
    }

    function debtValue(uint256 tokenId) public view returns (uint256) {
        return _tokenDebtValue[tokenId];
    }

}
