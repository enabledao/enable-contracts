pragma solidity ^0.5.2;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "../crowdloan/Crowdloan.sol";
import "../debt-contracts/RepaymentManager.sol";
import "../debt-contracts/TermsContract.sol";

contract CrowdloanFactory is Initializable {
    string constant ENABLE_CREDIT_PACKAGE = "enable-credit";
    string constant TERMS_CONTRACT = "TermsContract";
    string constant CROWDLOAN = "Crowdloan";
    string constant REPAYMENT_ROUTER = "RepaymentManager";

    App public app;

    event LoanCreated(
        address indexed borrower,
        uint256 indexed amount,
        address termsContract,
        address crowdloan,
        address debtToken,
        address repaymentManager
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

    function _createRepaymentManager(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(ENABLE_CREDIT_PACKAGE, REPAYMENT_ROUTER, admin, _data));
    }

    function deploy(
        address _principalTokenAddr,
        uint256 _principal,
        uint256 _amortizationUnitType,
        uint256 _termLength,
        uint256 _termPayment,
        uint256 _gracePeriodLength,
        uint256 _gracePeriodPayment,
        uint256 _interestRate,
        uint256 _crowdfundLength,
        uint256 _crowdfundStart
    ) public {
        // TODO(Dan): Asserts and require statements

        address termsContractInstance = _createTermsContract("");
        address crowdloanInstance = _createCrowdloan("");
        address repaymentManagerInstance = _createRepaymentManager("");

        // // address(uint160(addr))

        address[2] memory controllers = [crowdloanInstance, repaymentManagerInstance];

        TermsContract(termsContractInstance).initialize(
            _principalTokenAddr,
            _principal,
            _amortizationUnitType,
            _termLength,
            _termPayment,
            _gracePeriodLength,
            _gracePeriodPayment,
            _interestRate,
            controllers
        );

        Crowdloan(address(uint160(crowdloanInstance))).initialize(
            termsContractInstance,
            repaymentManagerInstance,
            _crowdfundLength,
            _crowdfundStart
        );

        RepaymentManager(repaymentManagerInstance).initialize(
            _principalTokenAddr,
            termsContractInstance,
            crowdloanInstance  
        );

        emit LoanCreated(
            msg.sender,
            _principal,
            termsContractInstance,
            debtTokenInstance,
            crowdloanInstance,
            repaymentManagerInstance
        );
    }
}
