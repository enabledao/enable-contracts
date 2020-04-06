pragma solidity 0.5.11;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";

contract CrowdloanToken is StandaloneERC20 {
    using SafeMath for uint256;

    function initialize(
        string memory name,
        string memory symbol,
        uint256 decimals,
        uint256 initialSupply,
        address initialHolder
    ) public {
        address[] memory emptyAdressArray = new address[](0);
        if (initialHolder == address(0)) {
            initialHolder = msg.sender;
        }

        StandaloneERC20.initialize(
            name,
            symbol,
            uint8(decimals),
            initialSupply,
            initialHolder,
            emptyAdressArray, //Minters
            emptyAdressArray //Pausers
        );
    }
}
