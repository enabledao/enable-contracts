pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/IRepaymentManager.sol";
import "../interface/ITermsContract.sol";
import "../access/ControllerRole.sol";
import "./TermsContractLib.sol";

/**
 * @title RepaymentManager
 * @dev This contract is inspired by OpenZeppelin's PaymentSplitter
 *
 * It follows a _pull payment_ model. Payments are not forwarded automatically, and lender will need to
 * trigger the actual transfer by calling the {release} function
 */
contract RepaymentManager is Initializable, IRepaymentManager, ControllerRole {
    using SafeMath for uint256;
    using TermsContractLib for TermsContractLib.LoanStatus;

    uint256 private _totalShares;

    mapping(address => uint256) private _shares;

    ITermsContract public termsContract;

    modifier beforeLoanFunded() {
        require(
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.FUNDING_COMPLETE,
            "Action only allowed before loan funding is completed"
        );
        _;
    }

    /**
     * @dev Constructor
     */
    function initialize(address _termsContract, address[] memory _controllers)
        public
        payable
        initializer
    {
        // address[] memory _controllers = new address[](1);
        // _controllers[0] = _controller;

        termsContract = ITermsContract(_termsContract);
        ControllerRole.initialize(_controllers);
    }

    function() external payable {
        revert("Ether not accepted");
    }

    /**
     * @return the total shares of the contract.
     */
    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    /**
     * @return the shares of an account.
     */
    function shares(address account) public view returns (uint256) {
        return _shares[account];
    }

    /**
     * @dev Increase shares of a shareholder.
     */
    function increaseShares(address account, uint256 shares_)
        public
        onlyController
        beforeLoanFunded
    {
        require(
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.FUNDING_FAILED,
            "Action only allowed before loan funding failed"
        );
        require(account != address(0), "Account must not be zero address");
        require(shares_ > 0, "Can not increase by zero shares");

        _increaseShares(account, shares_);

    }
    /**
     * @dev Increase shares of an existing payee.
     */
    function _increaseShares(address account, uint256 shares_) internal {
        _shares[account] = _shares[account].add(shares_);
        _totalShares = _totalShares.add(shares_);

        emit ShareIncreased(account, shares_);
    }
}
