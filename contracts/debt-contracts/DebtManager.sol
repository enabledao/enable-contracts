pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interface/IDebtManager.sol";

/*
    A debt token representing a stake in a crowdfunded loan.
    It represents a given percentage of ownership.

    The minter contract has minting rights
*/
contract DebtManager is IDebtManager {

        using SafeMath for uint;

        uint _totalDebt;
        mapping (uint => uint) private _tokenDebtValue;

        function _addDebtValue (uint tokenId, uint debtValue) internal returns (bool) {
            require(_tokenDebtValue[tokenId] == 0, 'Debt value already set and can only be cleared');
            _totalDebt = _totalDebt.add(debtValue);
            _tokenDebtValue[tokenId] = debtValue;
        }

        function _removeDebtValue (uint tokenId) internal returns (bool) {
            uint debtValue = _tokenDebtValue[tokenId];
            _tokenDebtValue[tokenId] = 0;
            _totalDebt = _totalDebt.sub(debtValue);
        }

        function totalDebt() public view returns (uint) {
            return _totalDebt;
        }

        function debtValue (uint tokenId) public view returns (uint) {
            return _tokenDebtValue[tokenId];
        }

}
