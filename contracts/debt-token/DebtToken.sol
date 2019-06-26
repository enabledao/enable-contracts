pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Metadata.sol";
import "../debt-contracts/DebtManager.sol";

/*
    A debt token representing a stake in a crowdfunded loan.
    It represents a given percentage of ownership.

    The minter contract has minting rights
*/
contract DebtToken is DebtManager, ERC721Enumerable, ERC721Metadata, ERC721Mintable {

        constructor (string memory name, string memory symbol) public ERC721Metadata(name, symbol) {
        // solhint-disable-previous-line no-empty-blocks
        }

        function mint(address to, uint256 debtAmount) public returns (uint tokenId) {
            _tokenId = totalSupply();
            super.mint(to, tokenId);
            _addDebtValue(to, debtAmount)
            return _tokenId;
        }

        function burn(address to, uint256 tokenId) public returns (bool) {
            _removeDebtValue(to, debtAmount)
            return true;
        }
}
