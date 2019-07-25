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
    uint256 private _totalReleased;

    mapping(address => uint256) private _shares;
    mapping(address => uint256) private _released;

    ITermsContract public termsContract;

    modifier onlyActiveLoan() {
        require(
            termsContract.getLoanStatus() == TermsContractLib.LoanStatus.FUNDING_COMPLETE ||
                termsContract.getLoanStatus() == TermsContractLib.LoanStatus.REPAYMENT_CYCLE,
            "Action only allowed while loan is Active"
        );
        _;
    }

    modifier beforeLoanFunded() {
        require(
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.FUNDING_COMPLETE,
            "Action only allowed before loan funding is completed"
        );
        _;
    }

    modifier trackRepaymentStatus() {
        _updateRepaymentStatus();
        _;
        _updateRepaymentStatus();
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
     * @return the total amount paid to contract.
     */
    function totalPaid() public view returns (uint256) {
        uint256 balance = _getPrincipalToken().balanceOf(address(this));
        return balance.add(_totalReleased);
    }

    /**
     * @return the total shares of the contract.
     */
    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    /**
     * @return the total amount already released.
     */
    function totalReleased() public view returns (uint256) {
        return _totalReleased;
    }

    /**
     * @return the shares of an account.
     */
    function shares(address account) public view returns (uint256) {
        return _shares[account];
    }

    /**
     * @return the amount already released to an account.
     */
    function released(address account) public view returns (uint256) {
        return _released[account];
    }

    /**
     * @return the release amount that an account could currently claim.
     */
    function releaseAllowance(address account) public view returns (uint256) {
        uint256 totalReceived = totalPaid();
        return totalReceived.mul(_shares[account]).div(_totalShares).sub(_released[account]);
    }

    /**
     * @notice Send funds
     * @param amount amount of tokens to send.
     */
    function pay(uint256 amount) public onlyActiveLoan trackRepaymentStatus {
        require(amount > 0, "No amount set to pay");

        uint256 balance = _getPrincipalToken().balanceOf(address(this));
        _getPrincipalToken().transferFrom(msg.sender, address(this), amount);
        require(
            _getPrincipalToken().balanceOf(address(this)) >= balance.add(amount),
            "Were the tokens successfully sent?"
        );
        emit PaymentReceived(msg.sender, amount);
    }

    /**
     * @dev Release one of the payee's proportional payment.
     * @param account Whose payments will be released.
     */
    function release(address payable account) public trackRepaymentStatus {

        require(
            termsContract.getLoanStatus() > TermsContractLib.LoanStatus.FUNDING_COMPLETE,
            "Action only allowed while loan is Active"
        );

        require(_shares[account] > 0, "Account has zero shares");

        uint256 payment = releaseAllowance(account);
        require(payment != 0, "Account has zero release allowance");

        _released[account] = _released[account].add(payment);
        _totalReleased = _totalReleased.add(payment);

        _getPrincipalToken().transfer(account, payment);
        emit PaymentReleased(account, payment);
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
        if (_shares[account] == 0) {
            _addPayee(account, shares_);
        } else {
            _increaseShares(account, shares_);
        }
    }

    /**
     * @dev Decrease shares of a shareholder.
     */
    function decreaseShares(address account, uint256 shares_)
        public
        onlyController
        beforeLoanFunded
    {
        _decreaseShares(account, shares_);
    }

    function _getPrincipalToken() internal view returns (IERC20 token) {
        return IERC20(termsContract.getPrincipalToken());
    }

    // @notice reconcile the loans funding status
    function _updateRepaymentStatus() internal {
        uint _totalDue;
        uint256 _totalPaid = totalPaid();

        (,,,,uint loanPeriod,,,) = termsContract.getLoanParams();
        for (uint lp = 0; lp < loanPeriod; lp++) {
            (,,,uint due) = termsContract.getScheduledPayment(lp+1);
            _totalDue = _totalDue + due;
        }

        if (
            _totalPaid > 0 &&
            _totalPaid < _totalDue &&
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.REPAYMENT_CYCLE
        ) {
            termsContract.setLoanStatus(TermsContractLib.LoanStatus.REPAYMENT_CYCLE);
        } else if (_totalPaid >= _totalDue) {
            termsContract.setLoanStatus(TermsContractLib.LoanStatus.REPAYMENT_COMPLETE);
        }
    }

    /**
     * @dev Increase shares of an existing payee.
     */
    function _increaseShares(address account, uint256 shares_) private {
        require(account != address(0), "Account must not be zero address");
        require(shares_ > 0, "Can not increase by zero shares");
        // require(_shares[account] >= 0, "Account has zero shares"); // DAN: this makes no sense

        _totalShares = _totalShares.add(shares_);
        uint256 newShares_ = _shares[account].add(shares_);
        _shares[account] = newShares_;
        emit ShareIncreased(account, shares_);
    }

    /**
     * @dev Decrease shares of an existing payee.
     */
    function _decreaseShares(address account, uint256 shares_) private {
        require(account != address(0), "Account must not be zero address");
        require(shares_ > 0, "Can not decrease by zero shares");
        require(_shares[account] > 0, "Account has zero shares");

        _totalShares = _totalShares.sub(shares_);
        uint256 newShares_ = _shares[account].sub(shares_);
        _shares[account] = newShares_;
        emit ShareDecreased(account, shares_);
    }

    /**
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param shares_ The number of shares owned by the payee.
     */
    function _addPayee(address account, uint256 shares_) private {
        require(account != address(0), "Account must not be zero address");
        require(shares_ > 0, "Can not add Payee with zero shares");
        require(_shares[account] == 0, "Account already has shares, use increaseShares");

        _shares[account] = shares_;
        _totalShares = _totalShares.add(shares_);
        emit PayeeAdded(account);
        emit ShareIncreased(account, shares_);
    }
}
