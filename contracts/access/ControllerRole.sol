pragma solidity 0.5.11;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/access/Roles.sol";

/*
    Controllers can never be changed after initialization
*/

contract ControllerRole is Initializable {
    using Roles for Roles.Role;

    event ControllerAdded(address indexed account);
    event ControllerRemoved(address indexed account);
    event LogAccess(address account);

    Roles.Role private _minters;

    function initialize(address[] memory _controllers) public initializer {
        for (uint256 i = 0; i < _controllers.length; i++) {
            _addController(_controllers[i]);
        }
    }

    modifier onlyController() {
        emit LogAccess(msg.sender);
        require(isController(msg.sender), "Permission denied");
        _;
    }

    function isController(address account) public view returns (bool) {
        return _minters.has(account);
    }

    function _addController(address account) internal {
        _minters.add(account);
        emit ControllerAdded(account);
    }

    uint256[50] private ______gap;
}
