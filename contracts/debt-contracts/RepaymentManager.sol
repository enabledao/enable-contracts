pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/IRepaymentManager.sol";
import "../interface/ITermsContract.sol";
import "../access/ControllerRole.sol";

contract RepaymentManager is Initializable, IRepaymentManager, ControllerRole {
    using SafeMath for uint256;

    uint256 private _totalShares;
    uint256 private _totalReleased;

    mapping(address => uint256) private _shares;
    mapping(address => uint256) private _released;
    address[] private _payees;

    IERC20 paymentToken;
    ITermsContract termsContract;

    modifier onlyActiveLoan() {
        require(termsContract.getLoanStatus() == 4 || termsContract.getLoanStatus() == 5);
        _;
    }

    /**
     * @dev Constructor
     */
    function initialize(address _paymentToken, address _termsContract, address _controller)
        public
        payable
        initializer
    {
        address[] memory _controllers = new address[](1);
        _controllers[0] = _controller;

        ControllerRole.initialize(_controllers);

        paymentToken = IERC20(_paymentToken);
    }

    function() external payable {
        revert();
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
     * @return the address of a payee.
     */
    function payee(uint256 index) public view returns (address) {
        return _payees[index];
    }

    /**
     * @return the total amount paid to contract.
     */
    function totalPaid() public view returns (uint256) {
        uint256 balance = paymentToken.balanceOf(address(this));
        return balance.add(_totalReleased);
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
     * @dev Release one of the payee's proportional payment.
     * @param account Whose payments will be released.
     */
    function release(address payable account) public {
        require(_shares[account] > 0);

        uint256 payment = releaseAllowance(account);
        require(payment != 0);

        _released[account] = _released[account].add(payment);
        _totalReleased = _totalReleased.add(payment);

        paymentToken.transfer(account, payment);
        emit PaymentReleased(account, payment);
    }

    function increaseShare(address account, uint256 shares_) public onlyController {
        _increaseShare(account, shares_);
    }

    function decreaseShare(address account, uint256 shares_) public onlyController {
        _decreaseShare(account, shares_);
    }

    /**
     * @dev Increase shares of an existing payee.
     */
    function _increaseShare(address account, uint256 shares_) private {
        require(account != address(0));
        require(shares_ > 0);
        require(_shares[account] >= 0);

        _shares[account] = shares_;
        _totalShares = _totalShares.add(shares_);
        emit ShareIncreased(account, shares_);
    }

    /**
     * @dev Decrease shares of an existing payee.
     */
    function _decreaseShare(address account, uint256 shares_) private {
        require(account != address(0));
        require(shares_ > 0);
        require(_shares[account] >= 0);

        _shares[account] = shares_;
        _totalShares = _totalShares.sub(shares_);
        emit ShareDecreased(account, shares_);
    }

    /**
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param shares_ The number of shares owned by the payee.
     */
    function _addPayee(address account, uint256 shares_) private {
        require(account != address(0));
        require(shares_ > 0);
        require(_shares[account] == 0);

        _payees.push(account);
        _shares[account] = shares_;
        _totalShares = _totalShares.add(shares_);
        emit PayeeAdded(account);
        emit ShareIncreased(account, shares_);
    }
}
