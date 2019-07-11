pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/token/ERC721/ERC721Mintable.sol";
import "openzeppelin-eth/contracts/token/ERC721/ERC721Enumerable.sol";
import "openzeppelin-eth/contracts/token/ERC721/ERC721Metadata.sol";
import "zos-lib/contracts/Initializable.sol";
import "./DebtManager.sol";

/*
    A debt token representing a stake in a crowdfunded loan.
    It represents a given percentage of ownership.
    The minter contract has minting rights
*/
contract DebtToken is Initializable, DebtManager, ERC721Enumerable, ERC721Mintable, ERC721Metadata {
    function initialize(string memory name, string memory symbol) public initializer {
        ERC721Enumerable.initialize();
        ERC721Mintable.initialize(msg.sender);
        ERC721Metadata.initialize(name, symbol);
    }

    function mint(address, uint256) public onlyMinter returns (bool) {
        revert(
            "function: addDebt(address to, uint256 debtAmount) public onlyMinter returns (bool)"
        );
    }

    function addDebt(address holder, uint256 debtAmount) public onlyMinter returns (bool) {
        uint256 _tokenId = totalSupply();
        super.mint(holder, _tokenId);
        _addDebtValue(_tokenId, debtAmount);
        return true;
    }

    function removeDebt(address holder, uint256 tokenId) public onlyMinter returns (bool) {
        require(holder == ownerOf(tokenId), "Not token owner");
        _removeDebtValue(tokenId);
        return true;
    }

}
