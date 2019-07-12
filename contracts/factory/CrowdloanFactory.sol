pragma solidity ^0.5.2;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "../crowdloan/Crowdloan.sol";
import "../debt-contracts/RepaymentRouter.sol";
import "../debt-contracts/TermsContract.sol";
import "../debt-token/DebtToken.sol";

contract CrowdloanFactory is Initializable {
    string constant ENABLE_CREDIT_PACKAGE = "enable-credit";
    string constant TERMS_CONTRACT = "TermsContract";
    string constant CROWDLOAN = "Crowdloan";
    string constant DEBT_TOKEN = "DebtToken";
    string constant REPAYMENT_ROUTER = "RepaymentRouter";

    App public app;

    event LoanCreated(
        address indexed borrower,
        uint256 indexed amount,
        address termsContract,
        address crowdloan,
        address debtToken,
        address repaymentRouter
    );

    event TestProxy(address proxy);

    function initialize(address _appContractAddress) public initializer {
        app = App(_appContractAddress);
    }

    function _createTermsContract(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, TERMS_CONTRACT, admin, _data));
    }

    function _createCrowdloan(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, CROWDLOAN, admin, _data));
    }

    function _createDebtToken(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, DEBT_TOKEN, admin, _data));
    }

    function _createRepaymentRouter(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, REPAYMENT_ROUTER, admin, _data));
    }

    function createProxy(address _impl, address _admin) public payable returns (address) {
        AdminUpgradeabilityProxy proxy = (new AdminUpgradeabilityProxy).value(msg.value)(
            _impl,
            _admin,
            ""
        );
        emit TestProxy(address(proxy));
        return address(proxy);
    }

    function deploy(
        address _principalTokenAddr,
        uint256 _principal,
        uint256 _timeUnitType,
        uint256 _loanPeriod,
        uint256 _termPayment,
        uint256 _gracePeriodLength,
        uint256 _gracePeriodPayment,
        uint256 _interestRate,
        uint256 _crowdfundLength,
        uint256 _crowdfundStart
    ) public {
        // TODO(Dan): Asserts and require statements

        address termsContractInstance = _createTermsContract("");
        address debtTokenInstance = _createDebtToken("");
        address crowdloanInstance = _createCrowdloan("");
        address repaymentRouterInstance = _createRepaymentRouter("");

        // // address(uint160(addr))

        TermsContract(termsContractInstance).initialize(
            _principalTokenAddr,
            _principal,
            _timeUnitType,
            _loanPeriod,
            _interestRate
        );

        // DebtToken(debtTokenInstance).initialize("EnableDebtToken", "EDT");

        Crowdloan(address(uint160(crowdloanInstance))).initialize(
            termsContractInstance,
            _crowdfundLength,
            _crowdfundStart
        );

        RepaymentRouter(repaymentRouterInstance).initialize(
            address(uint160(crowdloanInstance)),
            debtTokenInstance
        );

        emit LoanCreated(
            msg.sender,
            _principal,
            termsContractInstance,
            debtTokenInstance,
            crowdloanInstance,
            repaymentRouterInstance
        );
    }
}
