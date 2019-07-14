pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/IRepaymentManager.sol";
import "../interface/ITermsContract.sol";
import "../access/ControllerRole.sol";
import "./TermsContractLib.sol";

contract RepaymentManager is Initializable, IRepaymentManager, ControllerRole {
    using SafeMath for uint256;
    using TermsContractLib for TermsContractLib.LoanStatus;

    uint256 private _totalShares;
    uint256 private _totalReleased;

    mapping(address => uint256) private _shares;
    mapping(address => uint256) private _released;
    address[] private _payees;

    IERC20 public paymentToken;
    ITermsContract public termsContract;

    modifier onlyActiveLoan() {
        require(
            termsContract.getLoanStatus() == TermsContractLib.LoanStatus.FUNDING_COMPLETE ||
                termsContract.getLoanStatus() == TermsContractLib.LoanStatus.REPAYMENT_CYCLE,
                'Action only allowed while loan is Active'
        );
        _;
    }

    /**
     * @dev Constructor
     */
    function initialize(
        address _paymentToken,
        address _termsContract,
        address[] memory _controllers
    ) public payable initializer {
        // address[] memory _controllers = new address[](1);
        // _controllers[0] = _controller;

        ControllerRole.initialize(_controllers);

        paymentToken = IERC20(_paymentToken);
        termsContract = ITermsContract(_termsContract);
    }

    function() external payable {
        revert("Ether not accepted");
    }

    /**
     * @notice Send funds
     * @param amount amount of tokens to send.
     */
    function pay(uint256 amount) public {
        require(amount > 0, "No amount set to pay");

        uint256 balance = paymentToken.balanceOf(address(this));
        paymentToken.transferFrom(msg.sender, address(this), amount);
        require(
            paymentToken.balanceOf(address(this)) >= balance.add(amount),
            "Were the tokens successfully sent?"
        );

        emit PaymentReceived(msg.sender, amount);
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
     * @return the address of a payee.
     */
    function payee(uint256 index) public view returns (address) {
        return _payees[index];
    }

    /**
     * @dev Release one of the payee's proportional payment.
     * @param account Whose payments will be released.
     */
    function release(address payable account) public {
        require(_shares[account] > 0, 'Account has zero shares');

        uint256 payment = releaseAllowance(account);
        require(payment != 0, 'Account has zero release allowance');

        _released[account] = _released[account].add(payment);
        _totalReleased = _totalReleased.add(payment);

        paymentToken.transfer(account, payment);
        emit PaymentReleased(account, payment);
    }

    /**
     * @dev Increase shares of a shareholder.
     */
    function increaseShares(address account, uint256 shares_) public onlyController {
        if (_shares[account] == 0) {
            _addPayee(account, shares_);
        } else {
            _increaseShares(account, shares_);
        }
    }

    /**
     * @dev Decrease shares of a shareholder.
     */
    function decreaseShares(address account, uint256 shares_) public onlyController {
        _decreaseShares(account, shares_);
    }

    /**
     * @return the total amount paid to contract.
     */
    function totalPaid() public view returns (uint256) {
        uint256 balance = paymentToken.balanceOf(address(this));
        return balance.add(_totalReleased);
    }

    /**
     * @dev Increase shares of an existing payee.
     */
    function _increaseShares(address account, uint256 shares_) private {
        require(account != address(0), 'Account must not be zero address');
        require(shares_ > 0, 'Can not increase by zero shares');
        require(_shares[account] >= 0, 'Account has zero shares');

        _totalShares = _totalShares.add(shares_);
        uint256 newShares_ = _shares[account].add(shares_);
        _shares[account] = newShares_;
        emit ShareIncreased(account, shares_);
    }

    /**
     * @dev Decrease shares of an existing payee.
     */
    function _decreaseShares(address account, uint256 shares_) private {
        require(account != address(0), 'Account must not be zero address');
        require(shares_ > 0, 'Can not decrease by zero shares');
        // require(_shares[account] >= 0, 'Account has zero shares');

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
        require(account != address(0), 'Account must not be zero address');
        require(shares_ > 0, 'Can not add Payee with zero shares');
        require(_shares[account] == 0, 'Account already has shares, use increaseShares');

        _payees.push(account);
        _shares[account] = shares_;
        _totalShares = _totalShares.add(shares_);
        emit PayeeAdded(account);
        emit ShareIncreased(account, shares_);
    }
}
